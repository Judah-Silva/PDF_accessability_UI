import React, { useState, useRef } from 'react';
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Snackbar, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { useApiClient } from '../hooks/useApiClient';
import { useAuthContext } from '../context/AuthContext';
import imgFileQuestion from '../assets/pdf-question.svg';
import imgFileText from '../assets/pdf-icon.svg';
import imgCodeXml from '../assets/pdf-html.svg';
import './UploadSection.css';

import { PDFBucket, HTMLBucket, validateBucketConfiguration, validateFormatBucket } from '../utilities/constants';

function sanitizeFilename(filename, format = 'pdf') {
  // Normalize the filename to decompose accented characters
  const normalized = filename.normalize('NFD');
  // Remove combining diacritical marks
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '');
  // Remove any characters outside of the ISO-8859-1 range.
  // eslint-disable-next-line
  let sanitized = withoutDiacritics.replace(/[^\u0000-\u00FF]/g, '');
  
  // For PDF2HTML, apply comprehensive sanitization to match Bedrock Data Automation constraints
  if (format === 'html') {
    // Replace spaces with underscores
    sanitized = sanitized.replace(/\s/g, '_');
    
    // Replace characters that violate Bedrock Data Automation S3 URI constraints
    // Pattern disallows: \x00-\x1F (control chars), \x7F (DEL), { ^ } % ` ] " > [ ~ < # |
    // Also replace other problematic characters: & \ * ? / $ ! ' : @ + =
    // eslint-disable-next-line no-control-regex
    const problematicChars = /[\x00-\x1F\x7F{^}%`\]">[~<#|&\\*?/$!'":@+=]/g;
    sanitized = sanitized.replace(problematicChars, '_');
    
    // Replace multiple consecutive underscores with a single one
    while (sanitized.includes('__')) {
      sanitized = sanitized.replace(/__/g, '_');
    }
    
    // Remove leading/trailing underscores
    sanitized = sanitized.replace(/^_+|_+$/g, '');
  }
  
  // If the sanitized filename is empty, return a default value.
  return sanitized.trim() ? sanitized : 'default.pdf';
}


function UploadSection({ onUploadComplete }) {
  const { username } = useAuthContext();
  const { apiFetch } = useApiClient();
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [fileSizeMB, setFileSizeMB] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [formatAvailability, setFormatAvailability] = useState({ pdf: false, html: false });

  // Check format availability on component mount
  React.useEffect(() => {
    const pdfValidation = validateFormatBucket('pdf');
    const htmlValidation = validateFormatBucket('html');

    setFormatAvailability({
      pdf: pdfValidation.isConfigured,
      html: htmlValidation.isConfigured
    });
  }, []);

  const resetFileInput = () => {
    setSelectedFiles(null);
    setSelectedFormat(null);
    setFileSizeMB(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleFormatSelect = (format) => {
    // Check bucket configuration for the specific format
    const formatValidation = validateFormatBucket(format);
    const fullValidation = validateBucketConfiguration();

    // If both buckets are missing, show deployment popup
    if (fullValidation.needsFullDeployment) {
      setErrorMessage('Backend infrastructure not deployed. Please deploy the backend first.');
      setOpenSnackbar(true);

      // if (onShowDeploymentPopup) {
      //   onShowDeploymentPopup(fullValidation);
      // }
      return;
    }

    setSelectedFormat(format);
    setErrorMessage('');
  };

  const handleFileInput = async (inputFiles) => {
    if (!inputFiles || !inputFiles.length) return;


    // Reset any existing error messages
    setErrorMessage('');

    // **1. Basic PDF Checks**
    for (const file of inputFiles) {
      if (file.type !== 'application/pdf') {
        setErrorMessage('Only PDF files are allowed.');
        setOpenSnackbar(true);
        resetFileInput();
        return;
      }
    }

    // if (file.size > maxSizeAllowedMB * 1024 * 1024) {
    //   setErrorMessage(`File size exceeds the ${maxSizeAllowedMB} MB limit.`);
    //   setOpenSnackbar(true);
    //   resetFileInput();
    //   return;
    // }

    // **2. Page Count Check with pdf-lib**
    try {
      setSelectedFiles(inputFiles);
      // console.log('File object details:', {
      //   name: file.name,
      //   size: file.size,
      //   type: file.type,
      //   lastModified: file.lastModified
      // });
      if (inputFiles.length === 1) {
        const file = inputFiles[0];
        const sizeInBytes = file.size || 0;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        const displaySize = sizeInMB >= 0.1 ? parseFloat(sizeInMB.toFixed(1)) : parseFloat(sizeInMB.toFixed(2));
        setFileSizeMB(displaySize);
        console.log('File size set to:', sizeInMB, 'MB for file:', file.name, '(raw size:', file.size, 'bytes)');
      }
      // Pass the file directly to handleUpload
      const uploadRes = await Promise.all(inputFiles.map(handleUpload));
      const newFilenames = uploadRes.map(r => r.uniqueFilename);
      const sanitizedFilenames = uploadRes.map(r => r.sanitizedFilename);

      onUploadComplete(newFilenames, sanitizedFilenames, selectedFormat || 'pdf');
      // handleUpload(file);
    } catch (error) {
      setErrorMessage('Unable to read the PDF file.');
      setOpenSnackbar(true);
      resetFileInput();
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,application/pdf';
    input.onchange = (e) => {
      const files = [...e.target.files];
      if (files.length) handleFileInput(files);
    };
    input.click();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFiles = [...e.dataTransfer.files];
    if (droppedFiles.length) handleFileInput(droppedFiles);
  };

  const handleUpload = async (file) => {

    // **1. Check if the bucket for selected format is configured**
    const formatValidation = validateFormatBucket(selectedFormat);
    if (formatValidation.needsDeployment) {
      setErrorMessage(`${formatValidation.bucketType} not configured. Please install the required infrastructure first.`);
      setOpenSnackbar(true);
      return;
    }

    // **2. Check if user has reached the upload limit**
    // if (currentUsage >= maxFilesAllowed) {
    //   setErrorMessage('You have reached your upload limit. Please contact support for further assistance.');
    //   setOpenSnackbar(true);
    //   return;
    // }

    // **3. Basic Guards**
    if (!file) {
      setErrorMessage('Please select a PDF file before uploading.');
      setOpenSnackbar(true);
      return;
    }
    // if (!awsCredentials) {
    //   setErrorMessage('AWS credentials not available yet. Please wait...');
    //   setOpenSnackbar(true);
    //   return;
    // }

    // **3. Attempt to Increment Usage First**
    // const idToken = auth.user?.id_token;
    setIsUploading(true);

    try {
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, ''); // YYYYMMDDTHHMMSS format
      const userEmail = username || 'unkown-user'; // Use email for unique filename, fallback to 'user'
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_'); // Replace non-alphanumerics with underscores
      const sanitizedFileName = sanitizeFilename(file.name, selectedFormat) || 'default.pdf'; // Fallback to 'default.pdf' if sanitization fails
      const uniqueFilename = `${sanitizedEmail}_${timestamp}_${sanitizedFileName}`; // Combined unique filename

      // Select bucket and directory based on format
      // const selectedBucket = selectedFormat === 'html' ? HTMLBucket : PDFBucket;
      // const keyPrefix = selectedFormat === 'html' ? 'uploads/' : 'pdf/';

      const { uploadUrl } = await apiFetch('/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileName: uniqueFilename,
          fileType: file.type,
          fileSize: file.size,
          remediationType: selectedFormat === 'html' ? 'pdf2html' : 'pdf2pdf',
        }),
      });

      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'x-amz-server-side-encryption': 'AES256',
        },
        body: file,
      })

      if (!upload.ok) {
        throw new Error('S3 upload failed.')
      }

      // const command = new PutObjectCommand(params);
      // await client.send(command);

      console.log('File uploaded, new file name:', uniqueFilename);

      // **6. Notify Parent of Completion with format**
      // onUploadComplete(uniqueFilename, sanitizedFileName, selectedFormat || 'pdf');
      
      // **7. Refresh Usage**
      // if (onUsageRefresh) {
        //   onUsageRefresh();
      // }
        
      return { uniqueFilename, sanitizedFileName };
      // **8. Don't reset automatically - let parent component handle flow**
    } catch (error) {
      console.error('Error uploading file.');
      setErrorMessage('Error uploading file. Please try again.');
      setOpenSnackbar(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };


  if (selectedFormat === 'pdf' || selectedFormat === 'html') {
    const formatTitle = selectedFormat === 'pdf' ? 'PDF to PDF' : 'PDF to HTML';
    const formatIcon = selectedFormat === 'pdf' ? imgFileText : imgCodeXml;

    if (selectedFiles) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="upload-container-selected">
            <div className="upload-content">
              <div className="upload-header">
                <div className="file-icon">
                  <img src={formatIcon} alt="" />
                </div>
                <div className="upload-title">
                  <h2>{formatTitle}</h2>
                </div>
              </div>

              <div className="upload-progress">
                <div className="file-info">
                  { selectedFiles.length === 1 && (
                    <span className="file-name">{selectedFiles[0].name} • {fileSizeMB > 0 ? fileSizeMB : (selectedFiles[0]?.size ? (() => {
                      const size = selectedFiles[0].size / (1024 * 1024);
                      return size >= 0.1 ? size.toFixed(1) : size.toFixed(2);
                    })() : '0.0')} MB</span>
                  )}
                  <span className="progress-percent">{isUploading ? 'Uploading...' : 'Ready'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: isUploading ? '50%' : '100%' }}></div>
                </div>
              </div>

              {errorMessage && (
                <div className="upload-error">
                  <p>Upload failed: {errorMessage}</p>
                </div>
              )}

              <div className="upload-buttons">
                <button
                  className="change-file-btn"
                  onClick={() => {
                    setSelectedFiles(null);
                    setErrorMessage('');
                    setIsUploading(false);
                  }}
                  disabled={isUploading}
                >
                  Choose New PDF
                </button>
              </div>
            </div>

            <div className="disclaimer">
              <p>This solution does not remediate for fillable forms and color selection/ contrast for people with color blindness</p>
            </div>
          </div>

          {/* Snackbar for error messages */}
          <Snackbar
            open={openSnackbar}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }} elevation={6} variant="filled">
              {errorMessage}
            </Alert>
          </Snackbar>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="upload-container-selected"
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          >
          <div className="upload-content">
            <div className="upload-header">
              <div className="file-icon">
                <img src={formatIcon} alt="" />
              </div>
              <div className="upload-title">
                <h2>{formatTitle}</h2>
              </div>
            </div>

            <div className="upload-instructions">
              <p className="upload-main-text">Drop your PDFs here or click to browse</p>
              {/* <p className="upload-sub-text">Maximum file size: {maxSizeAllowedMB}MB • Maximum pages: {maxPagesAllowed}</p> */}
            </div>

            {errorMessage && (
              <div className="upload-error">
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="upload-buttons">
              <button className="change-format-btn" onClick={() => setSelectedFormat(null)}>
                Change Output Format
              </button>
              <button className="upload-btn" onClick={handleFileSelect} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload PDFs'}
              </button>
            </div>
          </div>

          <div className="disclaimer">
            <p>This solution does not remediate for fillable forms and color selection/contrast for people with color blindness</p>
          </div>
        </div>

        {/* Snackbar for error messages */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }} elevation={6} variant="filled">
            {errorMessage}
          </Alert>
        </Snackbar>
      </motion.div>
    );
  }

  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="upload-container">
        <div className="upload-content">
          <div className="upload-header">
            <div className="file-icon">
              <img src={imgFileQuestion} alt="" />
            </div>
            <div className="upload-title">
              <h2>Choose Output Format</h2>
            </div>
          </div>

          <div className="format-options">
            <div
              className={`format-option ${selectedFormat === 'pdf' ? 'selected' : ''}`}
              onClick={() => handleFormatSelect('pdf')}
            >
              <div className="format-header">
                <div className="format-icon">
                  <img src={imgFileText} alt="" />
                </div>
                <div className="format-info">
                  <span className="format-name">PDF to PDF</span>
                  <span className={`format-status ${formatAvailability.pdf ? 'available' : 'unavailable'}`}>
                    {formatAvailability.pdf ? '✓ Available' : '⚠ Install Required'}
                  </span>
                </div>
              </div>
              <p className="format-description">
                Improve accessibility and maintain document structure
              </p>
            </div>

            <div
              className={`format-option ${selectedFormat === 'html' ? 'selected' : ''}`}
              onClick={() => handleFormatSelect('html')}
            >
              <div className="format-header">
                <div className="format-icon">
                  <img src={imgCodeXml} alt="" />
                </div>
                <div className="format-info">
                  <span className="format-name">PDF to HTML</span>
                  <span className={`format-status ${formatAvailability.html ? 'available' : 'unavailable'}`}>
                    {formatAvailability.html ? '✓ Available' : '⚠ Install Required'}
                  </span>
                </div>
              </div>
              <p className="format-description">
                Convert document to accessible HTML version
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Snackbar for error messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }} elevation={6} variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
    </motion.div>
  );
}

export default UploadSection;
