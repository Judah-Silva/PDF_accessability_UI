// src/MainApp.js
import React, { useState, useEffect } from 'react';
import { useAuthContext } from './context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import ProcessingContainer from './components/ProcessingContainer';
import ResultsContainer from './components/ResultsContainer';
import LeftNav from './components/LeftNav';
import theme from './theme';
// import FirstSignInDialog from './components/FirstSignInDialog';
import HeroSection from './components/HeroSection';
import InformationBlurb from './components/InformationBlurb';

// import DeploymentPopup from './components/DeploymentPopup';

function MainApp() {
  const { isAuthenticated, logout, isLoading } = useAuthContext();
  const navigate = useNavigate();

  // AWS & file states
  const [currentPage, setCurrentPage] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processedResult, setProcessedResult] = useState(null);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState('');

  // Deployment validation state
  const [showDeploymentPopup, setShowDeploymentPopup] = useState(false);
  const [bucketValidation, setBucketValidation] = useState(null);

  // Left navigation state
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Monitor authentication status within MainApp
  useEffect(() => {
    if (isAuthenticated) {
      // If user is not authenticated, redirect to /home
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Bucket validation is now only checked when users select format options

  // Handler for showing deployment popup from child components
  const handleShowDeploymentPopup = (validation) => {
    setBucketValidation(validation);
    setShowDeploymentPopup(true);
  };

  // Handle events from child components
  const handleUploadComplete = (updated_filename, original_fileName, format = 'pdf') => {
    console.log('Upload completed, new file name:', updated_filename);
    console.log('Original file name:', original_fileName);
    console.log('Selected format:', format);

    const fileData = {
      name: original_fileName,
      updatedName: updated_filename,
      format: format,
      size: 0 // We'll get this from the upload component if needed
    };

    setUploadedFile(fileData);
    setProcessingStartTime(Date.now()); // Track when processing starts
    setCurrentPage('processing');

    // After a successful upload (and increment usage),
    // refresh usage so the new count shows up
    // refreshUsage();
  };

  const handleProcessingComplete = (result) => {
    // Calculate processing time
    const processingTime = processingStartTime
      ? Math.round((Date.now() - processingStartTime) / 1000) // Convert to seconds
      : null;

    setProcessedResult({ ...result, processingTime });
    setCurrentPage('results');
  };

  const handleNewUpload = () => {
    setCurrentPage('upload');
    setUploadedFile(null);
    setProcessedResult(null);
    setProcessingStartTime(null);
  };

  // Handle authentication loading and errors
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
        <LeftNav 
          isCollapsed={isNavCollapsed} 
          setIsCollapsed={setIsNavCollapsed}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
        />

        <Box sx={{ 
          padding: { xs: 2, sm: 3 }, 
          paddingLeft: { xs: 2, md: isNavCollapsed ? '90px' : '390px' }, 
          transition: 'padding-left 0.3s ease',
          minHeight: '100vh'
        }}>
          <Header
            handleSignOut={logout}
            // usageCount={usageCount}
            // refreshUsage={refreshUsage}
            usageError={usageError}
            loadingUsage={loadingUsage}
            // maxFilesAllowed={maxFilesAllowed}
            onMenuClick={() => setMobileNavOpen(true)}
          />

          {/* Deployment popup for bucket configuration - only shown when triggered */}
          {/* {showDeploymentPopup && bucketValidation && (
            <DeploymentPopup
              open={showDeploymentPopup}
              onClose={() => setShowDeploymentPopup(false)}
              validation={bucketValidation}
            />
          )} */}

          <HeroSection />

          <Container maxWidth="lg" sx={{ marginTop: 0, padding: { xs: 0, sm: 1 } }}>

            {currentPage === 'upload' && (
              <UploadSection
                onUploadComplete={handleUploadComplete}
                // awsCredentials={awsCredentials}
                // currentUsage={usageCount}
                // maxFilesAllowed={maxFilesAllowed}
                // maxPagesAllowed={maxPagesAllowed}
                // maxSizeAllowedMB={maxSizeAllowedMB}
                // onUsageRefresh={refreshUsage}
                // setUsageCount={setUsageCount}
                isFileUploaded={!!uploadedFile}
                onShowDeploymentPopup={handleShowDeploymentPopup}
              />
            )}

            {currentPage === 'processing' && uploadedFile && (
              <ProcessingContainer
                originalFileName={uploadedFile.name}
                updatedFilename={uploadedFile.updatedName}
                onFileReady={(downloadUrl) => handleProcessingComplete({ url: downloadUrl })}
                // awsCredentials={awsCredentials}
                selectedFormat={uploadedFile.format}
                onNewUpload={handleNewUpload}
              />
            )}

            {currentPage === 'processing' && !uploadedFile && (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading processing page...</p>
              </div>
            )}

            {currentPage === 'results' && (
              <ResultsContainer
                fileName={uploadedFile?.name}
                processedResult={processedResult}
                format={uploadedFile?.format}
                processingTime={processedResult?.processingTime}
                originalFileName={uploadedFile?.name}
                updatedFilename={uploadedFile?.updatedName}
                // awsCredentials={awsCredentials}
                onNewUpload={handleNewUpload}
              />
            )}


          </Container>

          <Box sx={{ marginTop: 8 }}>
            <InformationBlurb />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default MainApp;
