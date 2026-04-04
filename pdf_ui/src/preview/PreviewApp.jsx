import React from 'react';
import { Routes, Route, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import Header from '../components/Header';
import LeftNav from '../components/LeftNav';
import HeroSection from '../components/HeroSection';
import InformationBlurb from '../components/InformationBlurb';
import MaintenancePage from '../pages/MaintenancePage';
import LandingPage from '../pages/LandingPage';
import theme from '../theme';
import './preview.css';
import '../components/UploadSection.css';
import '../components/ProcessingContainer.css';
import '../components/ResultsContainer.css';

const previewRoutes = [
  { path: '/preview/maintenance', label: 'Maintenance' },
  { path: '/preview/callback', label: 'Callback' },
  { path: '/preview/app/upload', label: 'App Upload' },
  { path: '/preview/app/processing', label: 'App Processing' },
  { path: '/preview/app/results', label: 'App Results' },
];

function PreviewChrome({ children }) {
  const [isNavCollapsed, setIsNavCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
        <LeftNav
          isCollapsed={isNavCollapsed}
          setIsCollapsed={setIsNavCollapsed}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
        />

        <Box
          sx={{
            padding: { xs: 2, sm: 3 },
            paddingLeft: { xs: 2, md: isNavCollapsed ? '90px' : '390px' },
            transition: 'padding-left 0.3s ease',
            minHeight: '100vh',
          }}
        >
          <Header
            handleSignOut={() => {}}
            usageCount={2}
            refreshUsage={() => {}}
            usageError=""
            loadingUsage={false}
            maxFilesAllowed={8}
            onMenuClick={() => setMobileNavOpen(true)}
          />

          <HeroSection />

          <Container maxWidth="lg" sx={{ marginTop: 0, padding: { xs: 0, sm: 1 } }}>
            <PreviewRouteTabs activePath={location.pathname} />
            {children}
          </Container>

          <Box sx={{ marginTop: 8 }}>
            <InformationBlurb />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function PreviewRouteTabs({ activePath }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      sx={{ justifyContent: 'center', mb: 3 }}
    >
      {previewRoutes
        .filter((route) => route.path.startsWith('/preview/app/'))
        .map((route) => (
          <Button
            key={route.path}
            component={RouterLink}
            to={route.path}
            variant={activePath === route.path ? 'contained' : 'outlined'}
            sx={{
              textTransform: 'none',
              backgroundColor: activePath === route.path ? '#8c1d40' : '#fff',
              borderColor: '#8c1d40',
              color: activePath === route.path ? '#fff' : '#8c1d40',
              '&:hover': {
                backgroundColor: activePath === route.path ? '#7a1a37' : '#fef7f7',
                borderColor: '#7a1a37',
              },
            }}
          >
            {route.label}
          </Button>
        ))}
    </Stack>
  );
}

function PreviewIndex() {
  return (
    <ThemeProvider theme={theme}>
      <Box className="preview-index">
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#8c1d40', mb: 2 }}>
          Preview Routes
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 720, textAlign: 'center', mb: 4 }}>
          Use these local routes to open each front-end template directly without Cognito or backend dependencies.
        </Typography>

        <Box className="preview-index-grid">
          {previewRoutes.map((route) => (
            <RouterLink key={route.path} to={route.path} className="preview-index-card">
              <span className="preview-index-label">{route.label}</span>
              <code>{route.path}</code>
            </RouterLink>
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function PreviewLandingPage() {
  return (
    <ThemeProvider theme={theme}>
      <Box className="preview-landing">
        <Box className="preview-landing-topbar" />
        <Box className="preview-landing-gradient" />

        <Box className="preview-landing-hero">
          <Box className="preview-landing-copy">
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
              PDF Accessibility Remediation
            </Typography>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'medium', mb: 2 }}>
              Preview Mode
            </Typography>
            <Typography variant="body1" paragraph>
              This route is a styling-safe version of the public landing page. It avoids authentication so you can
              restyle the marketing experience locally.
            </Typography>
            <Typography variant="body1" paragraph>
              Use the links on the right to jump directly into the protected app templates like upload, processing,
              and results.
            </Typography>
          </Box>

          <Box className="preview-landing-actions">
            <Box className="preview-landing-card">
              <Typography variant="h5" sx={{ mb: 3, color: '#FFC627', fontWeight: 'bold', textAlign: 'center' }}>
                Frontend Template Links
              </Typography>
              <Stack spacing={1.5} sx={{ width: '100%' }}>
                <Button component={RouterLink} to="/preview/app/upload" variant="contained" sx={previewPrimaryButtonSx}>
                  Open Upload Template
                </Button>
                <Button component={RouterLink} to="/preview/app/processing" variant="contained" sx={previewPrimaryButtonSx}>
                  Open Processing Template
                </Button>
                <Button component={RouterLink} to="/preview/app/results" variant="contained" sx={previewPrimaryButtonSx}>
                  Open Results Template
                </Button>
                <Button component={RouterLink} to="/preview/maintenance" variant="outlined" sx={previewSecondaryButtonSx}>
                  Open Maintenance Template
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function PreviewCallbackPage() {
  return (
    <ThemeProvider theme={theme}>
      <Box className="preview-callback">
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Callback Preview
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          This is a placeholder for the auth callback screen. In real usage it redirects to `/app` or `/home`.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/preview/landing" variant="outlined" sx={previewSecondaryButtonSx}>
            Back to Landing
          </Button>
          <Button component={RouterLink} to="/preview/app/upload" variant="contained" sx={previewPrimaryButtonSx}>
            Open App Preview
          </Button>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}

function PreviewUploadTemplate() {
  return (
    <div className="upload-container-selected">
      <div className="upload-content">
        <div className="upload-instructions">
          <p className="upload-main-text">Choose your remediation format and upload a sample PDF.</p>
          <p className="upload-sub-text">Preview mode disables auth, uploads, and backend processing.</p>
        </div>

        <div className="preview-format-row">
          <button className="preview-format-card preview-format-card-active" type="button">
            <span className="preview-format-title">PDF to PDF</span>
            <span className="preview-format-copy">Accessible PDF output</span>
          </button>
          <button className="preview-format-card" type="button">
            <span className="preview-format-title">PDF to HTML</span>
            <span className="preview-format-copy">HTML package output</span>
          </button>
        </div>

        <div className="upload-progress">
          <div className="file-info">
            <span className="file-name">Hartnell-course-outline.pdf</span>
            <span className="progress-percent">Ready</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="upload-buttons">
          <button className="change-format-btn" type="button">Change Format</button>
          <button className="upload-btn" type="button">Upload PDF</button>
        </div>
      </div>

      <div className="disclaimer">
        <p>
          This route is intentionally static so you can use browser dev tools and restyle the upload template without
          needing Cognito, S3, or quota APIs.
        </p>
      </div>
    </div>
  );
}

function PreviewProcessingTemplate() {
  const steps = [
    ['1', 'Analyzing Document Structure', 'Scanning PDF for accessibility issues'],
    ['2', 'Adding Accessibility Tags', 'Implementing WCAG 2.1 compliance'],
    ['3', 'Adding Metadata', 'Final accessibility enhancements'],
    ['4', 'Generating Accessible PDF', 'Creating your accessible PDF document'],
  ];

  return (
    <div className="processing-container">
      <div className="processing-content">
        <div className="processing-header">
          <div className="header-content">
            <h2>Processing: Hartnell-course-outline.pdf</h2>
            <div className="flow-indicator">PDF → PDF</div>
          </div>
        </div>

        <div className="processing-info">
          <div className="time-info">
            <span>Time elapsed: 1:24</span>
          </div>
          <p className="processing-description">
            Remediation process typically takes a few minutes to complete depending on the document complexity.
          </p>
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '72%' }} />
          </div>

          <div className="steps-list">
            {steps.map(([number, title, description], index) => (
              <div key={title} className="step-item">
                <div className={`step-number ${index < 3 ? 'active' : ''}`}>{number}</div>
                <div className="step-content">
                  <div className="step-title">{title}</div>
                  <div className="step-description">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewResultsTemplate() {
  return (
    <div className="results-container">
      <div className="results-content">
        <div className="results-header">
          <h2>PDF Remediation Successful</h2>
          <div className="flow-indicator">PDF → PDF</div>
        </div>

        <div className="processing-info">
          <div className="processing-time">
            <span>Total Processing Time: 2m 12s</span>
          </div>
          <p className="description">Your PDF has been successfully remediated for accessibility.</p>
        </div>

        <div className="file-success-container">
          <div className="file-info-card">
            <div className="file-name-section">
              <div className="file-icon">
                <img alt="" className="block max-w-none size-full" src={require('../assets/pdf-icon.svg')} />
              </div>
              <div className="file-details">
                <div className="file-name">Hartnell-course-outline.pdf</div>
                <div className="file-status">File processed successfully</div>
              </div>
            </div>
          </div>
        </div>

        <div className="button-group">
          <button className="view-report-btn" type="button">View Report</button>
          <button className="download-btn" type="button">Download PDF File</button>
        </div>

        <div className="upload-new-section">
          <button className="upload-new-btn" type="button">Upload a New PDF</button>
        </div>
      </div>
    </div>
  );
}

const previewPrimaryButtonSx = {
  textTransform: 'none',
  backgroundColor: '#8c1d40',
  '&:hover': {
    backgroundColor: '#7a1a37',
  },
};

const previewSecondaryButtonSx = {
  textTransform: 'none',
  borderColor: '#8c1d40',
  color: '#8c1d40',
  '&:hover': {
    borderColor: '#7a1a37',
    backgroundColor: '#fef7f7',
  },
};

function PreviewApp() {
  return (
    <ThemeProvider theme={theme}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/preview" element={<PreviewIndex />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/preview/landing" element={<PreviewLandingPage />} />
        <Route path="/preview/maintenance" element={<MaintenancePage />} />
        <Route path="/preview/callback" element={<PreviewCallbackPage />} />
        <Route
          path="/preview/app/upload"
          element={
            <PreviewChrome>
              <PreviewUploadTemplate />
            </PreviewChrome>
          }
        />
        <Route
          path="/preview/app/processing"
          element={
            <PreviewChrome>
              <PreviewProcessingTemplate />
            </PreviewChrome>
          }
        />
        <Route
          path="/preview/app/results"
          element={
            <PreviewChrome>
              <PreviewResultsTemplate />
            </PreviewChrome>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default PreviewApp;
