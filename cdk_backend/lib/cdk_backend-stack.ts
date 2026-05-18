import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cr from 'aws-cdk-lib/custom-resources';

export class CdkBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const PDF_TO_PDF_BUCKET = this.node.tryGetContext('PDF_TO_PDF_BUCKET');
    const PDF_TO_HTML_BUCKET = this.node.tryGetContext('PDF_TO_HTML_BUCKET');
    const COGNITO_ID = this.node.tryGetContext('COGNITO_ID');

    // Validate that at least one bucket is provided
    if (!PDF_TO_PDF_BUCKET && !PDF_TO_HTML_BUCKET) {
      throw new Error(
        "At least one bucket name is required! Pass using -c PDF_TO_PDF_BUCKET=<name> or -c PDF_TO_HTML_BUCKET=<name>"
      );
    }

    // Import buckets independently
    let pdfBucket: s3.IBucket | undefined = undefined;
    let htmlBucket: s3.IBucket | undefined = undefined;

    if (PDF_TO_PDF_BUCKET) {
      pdfBucket = s3.Bucket.fromBucketName(this, 'PDFBucket', PDF_TO_PDF_BUCKET);
      console.log(`Using PDF-to-PDF bucket: ${pdfBucket.bucketName}`);
    }

    if (PDF_TO_HTML_BUCKET) {
      htmlBucket = s3.Bucket.fromBucketName(this, 'HTMLBucket', PDF_TO_HTML_BUCKET);
      console.log(`Using PDF-to-HTML bucket: ${htmlBucket.bucketName}`);
    }

    // Use the first available bucket as the main bucket for other resources
    const mainBucket = pdfBucket || htmlBucket!;
    console.log(`Using main bucket for other resources: ${mainBucket.bucketName}`);

    // --------- Create Amplify App for Manual Deployment ----------
    const amplifyApp = new amplify.App(this, 'pdfui-amplify-app', {
      description: 'PDF Accessibility UI - Manual Deployment',
      // No sourceCodeProvider for manual deployment
    });

    // Create main branch for manual deployment
    const mainBranch = amplifyApp.addBranch('main', {
      autoBuild: false, // Manual deployment
      stage: 'PRODUCTION'
    });

    // Add redirect rules for SPA routing
    amplifyApp.addCustomRule(new amplify.CustomRule({
      source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
      target: '/index.html',
      status: amplify.RedirectStatus.REWRITE
    }));

    amplifyApp.addCustomRule(new amplify.CustomRule({
      source: '/home',
      target: '/index.html',
      status: amplify.RedirectStatus.REWRITE
    }));

    amplifyApp.addCustomRule(new amplify.CustomRule({
      source: '/callback',
      target: '/index.html',
      status: amplify.RedirectStatus.REWRITE
    }));

    amplifyApp.addCustomRule(new amplify.CustomRule({
      source: '/app',
      target: '/index.html',
      status: amplify.RedirectStatus.REWRITE
    }));

    const appUrl = `https://main.${amplifyApp.appId}.amplifyapp.com`;
    const customUrl = 'https://pdf.hartnell.edu';
    const cognitoDomain = `pdfui.auth.${this.region}.amazoncognito.com`;
    const cognitoCallback = `${customUrl}/callback`;
    const cognitoUserPool = cognito.UserPool.fromUserPoolId(this, 'PDF-Accessability-User-Pool', COGNITO_ID);
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [cognitoUserPool],
    });

    // --------- Set CORS on imported S3 buckets via custom resource ----------
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
          AllowedOrigins: [appUrl, customUrl, 'http://localhost:3000'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    };

    if (pdfBucket) {
      new cr.AwsCustomResource(this, 'PdfBucketCors', {
        onCreate: {
          service: 'S3',
          action: 'putBucketCors',
          parameters: {
            Bucket: pdfBucket.bucketName,
            CORSConfiguration: corsConfiguration,
          },
          physicalResourceId: cr.PhysicalResourceId.of('PdfBucketCorsConfig'),
        },
        onUpdate: {
          service: 'S3',
          action: 'putBucketCors',
          parameters: {
            Bucket: pdfBucket.bucketName,
            CORSConfiguration: corsConfiguration,
          },
          physicalResourceId: cr.PhysicalResourceId.of('PdfBucketCorsConfig'),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['s3:PutBucketCORS'],
            resources: [pdfBucket.bucketArn],
          }),
        ]),
      });
      console.log(`CORS configured for PDF bucket: ${pdfBucket.bucketName}`);
    }

    if (htmlBucket) {
      new cr.AwsCustomResource(this, 'HtmlBucketCors', {
        onCreate: {
          service: 'S3',
          action: 'putBucketCors',
          parameters: {
            Bucket: htmlBucket.bucketName,
            CORSConfiguration: corsConfiguration,
          },
          physicalResourceId: cr.PhysicalResourceId.of('HtmlBucketCorsConfig'),
        },
        onUpdate: {
          service: 'S3',
          action: 'putBucketCors',
          parameters: {
            Bucket: htmlBucket.bucketName,
            CORSConfiguration: corsConfiguration,
          },
          physicalResourceId: cr.PhysicalResourceId.of('HtmlBucketCorsConfig'),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['s3:PutBucketCORS'],
            resources: [htmlBucket.bucketArn],
          }),
        ]),
      });
      console.log(`CORS configured for HTML bucket: ${htmlBucket.bucketName}`);
    }

    const userUploadLambdaRole = new iam.Role(this, 'UserUploadLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })
    
    // Grant CloudWatch Logs permissions
    userUploadLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );
    
    // Create the Lambda with the role
    const userUploadLambda = new lambda.Function(this, 'UserUploadLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/userUpload/'),
      timeout: cdk.Duration.seconds(30),
      role: userUploadLambdaRole,
      environment: {
        PDF_TO_PDF_BUCKET: pdfBucket?.bucketName || "",
        PDF_TO_HTML_BUCKET: htmlBucket?.bucketName || "",
      }
    })

    console.log(`Created UserUploadLambda: ${userUploadLambda.functionName}`);
    
    const userDownloadLambdaRole = new iam.Role(this, 'UserDownloadLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })
    
    // Grant CloudWatch Logs permissions
    userDownloadLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );
    
    // Create the Lambda with the role
    const userDownloadLambda = new lambda.Function(this, 'UserDownloadLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/userDownload/'),
      timeout: cdk.Duration.seconds(30),
      role: userDownloadLambdaRole,
      environment: {
        PDF_TO_PDF_BUCKET: pdfBucket?.bucketName || "",
        PDF_TO_HTML_BUCKET: htmlBucket?.bucketName || "",
      }
    })

    console.log(`Created UserDownloadLambda: ${userDownloadLambda.functionName}`);
    
    const fileStatusLambdaRole = new iam.Role(this, 'FileStatusLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })
    
    // Grant CloudWatch Logs permissions
    fileStatusLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );
    
    // Create the Lambda with the role
    const fileStatusLambda = new lambda.Function(this, 'FileStatusLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/fileStatus/'),
      timeout: cdk.Duration.seconds(30),
      role: fileStatusLambdaRole,
      environment: {
        PDF_TO_PDF_BUCKET: pdfBucket?.bucketName || "",
        PDF_TO_HTML_BUCKET: htmlBucket?.bucketName || "",
      }
    })

    console.log(`Created fileStatusLambda: ${fileStatusLambda.functionName}`);

    // Create S3 policy for both buckets
    if (pdfBucket) {
      pdfBucket.grantPut(userUploadLambda);
      pdfBucket.grantRead(userDownloadLambda);
      pdfBucket.grantRead(fileStatusLambda);
      console.log(`Granting PDF-PDF Bucket PUT/READ permissions.`);
    }
    if (htmlBucket) {
      htmlBucket.grantPut(userUploadLambda);
      htmlBucket.grantRead(userDownloadLambda);
      htmlBucket.grantRead(fileStatusLambda);
      console.log(`Granting PDF-HTML Bucket PUT/READ permissions.`);
    }

    // ------------------- Lambda Function API Gateways -------------------
   
    //  Create API Gateway for lambda functions
    const pdfRemediationAPI = new apigateway.RestApi(this, 'PdfRemediationAPI', {
      restApiName: 'PdfRemediationAPI',
      description: 'API file transaction lambdas.',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: [appUrl, customUrl, 'http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type, Authorization'],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: false,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    // POST /upload
    pdfRemediationAPI.root.addResource('upload').addMethod(
      'POST',
      new apigateway.LambdaIntegration(userUploadLambda),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // POST /download
    pdfRemediationAPI.root.addResource('download').addMethod(
      'POST',
      new apigateway.LambdaIntegration(userDownloadLambda),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    )

    // GET /file-status
    pdfRemediationAPI.root.addResource('file-status').addMethod(
      'GET',
      new apigateway.LambdaIntegration(fileStatusLambda),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    )

    const usagePlan = pdfRemediationAPI.addUsagePlan('DefaultUsagePlan', {
      name: 'DefaultUsagePlan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
    });

    usagePlan.addApiStage({ stage: pdfRemediationAPI.deploymentStage });

    // const hostedUiDomain = `https://pdf-ui-auth.auth.${this.region}.amazoncognito.com/login/continue?client_id=${userPoolClient.userPoolClientId}&redirect_uri=https%3A%2F%2Fmain.${amplifyApp.appId}.amplifyapp.com&response_type=code&scope=email+openid+phone+profile`
    // const Authority = `cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;

    // ------------------ Pass environment variables to Amplify ------------------
    mainBranch.addEnvironment('REACT_APP_BUCKET_NAME', mainBucket.bucketName);
    mainBranch.addEnvironment('REACT_APP_BUCKET_REGION', this.region);
    mainBranch.addEnvironment('REACT_APP_AWS_REGION', this.region);

    // Separate buckets for different formats - use provided buckets independently
    if (PDF_TO_PDF_BUCKET) {
      mainBranch.addEnvironment('REACT_APP_PDF_BUCKET_NAME', PDF_TO_PDF_BUCKET);
    }
    if (PDF_TO_HTML_BUCKET) {
      mainBranch.addEnvironment('REACT_APP_HTML_BUCKET_NAME', PDF_TO_HTML_BUCKET);
    }

    mainBranch.addEnvironment('REACT_APP_HOSTED_UI_URL', customUrl);
    mainBranch.addEnvironment('REACT_APP_API_BASE', pdfRemediationAPI.url);
    mainBranch.addEnvironment('REACT_APP_COGNITO_DOMAIN', cognitoDomain);
    mainBranch.addEnvironment('REACT_APP_COGNITO_CLIENT_ID', COGNITO_ID);
    mainBranch.addEnvironment('REACT_APP_REDIRECT_URI', cognitoCallback);

    // --------------------------- Outputs ------------------------------
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.appId,
      description: 'Amplify Application ID',
    });

    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      value: customUrl,
      description: 'Amplify Application URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: pdfRemediationAPI.url,
      description: 'Lambda API base URL'
    })

  }
}
