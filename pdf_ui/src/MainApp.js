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
  const [uploadedFiles, setUploadedFiles] = useState(null);
  const [uploadedFilenames, setUploadedFilenames] = useState(null);
  const [originalFileNames, setOriginalFilenames] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [processedResult, setProcessedResult] = useState(null);
  const [processingStartTime, setProcessingStartTime] = useState(null);
  // const [loadingUsage, setLoadingUsage] = useState(false);
  // const [usageError, setUsageError] = useState('');

  // Deployment validation state
  const [showDeploymentPopup, setShowDeploymentPopup] = useState(false);
  const [bucketValidation, setBucketValidation] = useState(null);

  // Left navigation state
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Monitor authentication status within MainApp
  useEffect(() => {
    if (!isAuthenticated) {
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
  const handleUploadComplete = (updated_filenames, original_fileNames, format = 'pdf') => {
    console.log('Upload completed, new file names:', updated_filenames);
    console.log('Original file names:', original_fileNames);
    console.log('Selected format:', format);

    const fileData = []
    for (let i = 0; i < updated_filenames.length; i++) {
      fileData.push({
        name: original_fileNames[i],
        updatedName: updated_filenames[i],
        format: format,
        size: 0 // We'll get this from the upload component if needed
      });
    }

    setUploadedFiles(fileData);
    setUploadedFilenames(updated_filenames);
    setOriginalFilenames(original_fileNames);
    setSelectedFormat(format);
    setProcessingStartTime(Date.now()); // Track when processing starts
    setCurrentPage('processing');

    // After a successful upload (and increment usage),
    // refresh usage so the new count shows up
    // refreshUsage();
  };

  /**
   * 
   * @param {{ objectKey: string, downloadUrl: string }[]} processedFiles 
   */
  const handleProcessingComplete = (processedFiles) => {
    // Calculate processing time
    const processingTime = processingStartTime
      ? Math.round((Date.now() - processingStartTime) / 1000) // Convert to seconds
      : null;

    setProcessedResult({ processedFiles, processingTime });
    setCurrentPage('results');
  };

  const handleNewUpload = () => {
    setCurrentPage('upload');
    setSelectedFormat(null);
    setUploadedFilenames(null);
    setOriginalFilenames(null);
    setUploadedFiles(null);
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
            onMenuClick={() => setMobileNavOpen(true)}
          />

          <HeroSection />

          <Container maxWidth="lg" sx={{ marginTop: 0, padding: { xs: 0, sm: 1 } }}>

            {currentPage === 'upload' && (
              <UploadSection
                onUploadComplete={handleUploadComplete}
              />
            )}

            {currentPage === 'processing' && uploadedFiles && (
              <ProcessingContainer
                pendingFilenames={uploadedFilenames}
                setPendingFilenames={setUploadedFilenames}
                onAllFilesReady={(processedFiles) => handleProcessingComplete(processedFiles)}
                selectedFormat={selectedFormat}
                onNewUpload={handleNewUpload}
              />
            )}

            {currentPage === 'processing' && !uploadedFiles && (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading processing page...</p>
              </div>
            )}

            {currentPage === 'results' && (
              <ResultsContainer
                // fileName={uploadedFile?.name}
                processedResult={processedResult}
                format={selectedFormat}
                processingTime={processedResult?.processingTime}
                originalFileName={originalFileNames.length > 0 ? originalFileNames[0] : null}
                updatedFilename={uploadedFilenames.length > 0 ? uploadedFilenames[0] : null}
                // resultFilename={processedResult?.finalName}
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
