import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// MUI Components
import {
  Box,
  Typography,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

// MUI Icons
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';

// Images
import bottomGradient from '../assets/bottom_gradient.svg';
import hartnellLogo from '../assets/hartnell-logo.svg';
import { PRIMARY_MAIN } from '../utilities/constants';

// Styled Components
import { styled } from '@mui/system';

const StyledLink = styled(Link)(({ theme }) => ({
  color: '#8C1D40',
  textDecoration: 'underline',
  component: 'a',
  '&:hover': {
    color: '#70122F',
  },
}));

const GradientBox = styled(Box)(({ theme }) => ({
  backgroundColor: PRIMARY_MAIN,
  padding: theme.spacing(5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: 560,
  borderRadius: '1.5rem',
  boxShadow: '0 18px 40px rgba(0, 0, 0, 0.25)',
}));

const LandingPage = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  // const auth = authContext ?? {
  //   isLoading: false,
  //   isAuthenticated: false,
  //   signinRedirect: () => {},
  // };
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  // check for error param from Duo callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth_failed') {
      setLoginError('Authentication failed. Please try again.');
      // clean the param off the URL so it doesn't persist on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      return;
    }

    setLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
 
      if (!res.ok) {
        setLoginError('Login unavailable. Please try again.');
        return;
      }
 
      const { authUrl } = await res.json();
 
      // hand off to Duo — userCallback Lambda handles the rest
      window.location.href = authUrl;
 
    } catch {
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={50} thickness={5} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: '#fff',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          backgroundColor: '#fff',
          height: '36px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      {/* Bottom Gradient */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          top: '50%',
          backgroundImage: `url(${bottomGradient})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          zIndex: -1,
        }}
      />

      {/* Hero Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          color: '#48002E',
          minHeight: '65vh',
          alignItems: 'center',
          justifyContent: 'center',
          pb: 6,
          pt: 6,
          flexGrow: 1,
          px: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 860,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Box
            component="img"
            src={hartnellLogo}
            alt="Hartnell College logo"
            sx={{
              width: '100%',
              maxWidth: 320,
              height: 'auto',
            }}
          />

          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              maxWidth: 680,
            }}
          >
            PDF Accessibility Remediation
          </Typography>

          <GradientBox component="form" onSubmit={handleSignIn}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                color: '#FFC627',
                textAlign: 'center',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
              }}
            >
              READY TO TRANSFORM YOUR PDF?
            </Typography>

            {/* Email input */}
            <TextField
              type="email"
              placeholder="Enter your email"
              value={username}
              onChange={e => setUsername(e.target.value.split('@')[0])}
              required
              disabled={loading}
              fullWidth
              size="small"
              inputProps={{ maxLength: 255 }}
              sx={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.5rem',
                },
              }}
            />

            {/* Error message */}
            {loginError && (
              <Typography
                variant="body2"
                sx={{ color: '#FFC627', textAlign: 'center' }}
              >
                {loginError}
              </Typography>
            )}

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIosIcon />}
              loading={loading}
              disabled={!username.trim()}
              loadingIndicator={
                <CircularProgress
                  size={24}
                  sx={{ color: '#000' }}
                />
              }
              sx={{
                backgroundColor: '#FFC627',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1rem',
                padding: '1rem 1.375rem',
                minWidth: 350,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '1.25rem',
                transition: 'transform 0.2s, background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  backgroundColor: '#e6ae22',
                  transform: 'scale(1.05)',
                },
                '&.MuiLoadingButton-loading': {
                  backgroundColor: '#FFC627',
                },
              }}
            >
              Log In and Remediate My PDF
            </LoadingButton>
          </GradientBox>

          <Box sx={{ mt: 2 }}>
            <StyledLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleOpenDialog();
              }}
              sx={{ fontSize: '0.9rem', color: '#860038' }}
            >
              Learn more about the remediation process
            </StyledLink>
          </Box>
        </Box>
      </Box>

      {/* Thin Yellow Line */}
      <Box
        sx={{
          height: '5px',
          backgroundColor: '#FFC627',
        }}
      />

      {/* Support Resources Section */}
      <Box
        sx={{
          p: 4,
          borderTop: '1px solid #ddd',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Support resources:
        </Typography>
        <Typography variant="body1" component="p" sx={{ maxWidth: 680 }}>
          If you need assistance,{' '}
          <StyledLink
            href="https://www.hartnell.edu/forms/accessibility-feedback-form.html"
            target="_blank"
            rel="noopener"
          >
            please submit a help ticket in the Panther Portal
          </StyledLink>
          .
        </Typography>
      </Box>

      {/* 
        Dialog (modal) for remediation process
      */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="remediation-dialog-title"
      >
        <DialogTitle
          id="remediation-dialog-title"
          sx={{ pr: 4, position: 'relative' }}
        >
          <strong>Remediation Process</strong>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body1" component="p"  paragraph>
            Here’s how our PDF Remediation process works:
          </Typography>

          <Typography variant="body2" component="p" paragraph>
            1. <strong>Upload a Document:</strong> Once you are logged in,
            simply select a PDF to upload for remediation.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            2. <strong>Remediation:</strong> We use an automated approach,
            supported by Adobe’s API and AWS services, to fix common accessibility
            issues like missing tags, incorrect reading order, Alt Text and more.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            3. <strong>Download Your Accessible PDF:</strong> Within a short
            time, you’ll receive your remediated PDF and accessiblity reports ready to share with
            everyone.
          </Typography>

          {/* Additional Restrictions Section */}
          <Typography variant="body1" component="p" paragraph sx={{ mt: 2 }}>
            <strong>Please note the following restrictions before uploading:</strong>
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            1. Each user is limited to <strong>3</strong> PDF document uploads.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            2. Documents cannot exceed <strong>10</strong> pages.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            3. Documents must be smaller than <strong>25</strong> MB.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            4. Do not upload documents containing sensitive information.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            5. This solution only remediates PDF documents. Other document types will not be accepted.
          </Typography>
          <Typography variant="body2" component="p" paragraph>
            6. This solution does not remediate fillable forms or handle color selection/contrast.
          </Typography>
          <Typography variant="body1" component="p" paragraph>
            This solution is <em>open source</em> and can be deployed in your
            own AWS environment. Check out{' '}
            <StyledLink
              href="https://github.com/ASUCICREPO/PDF_Accessibility"
              target="_blank"
              rel="noopener"
              sx={{ ml: 0.5 }}
            >
              Github
            </StyledLink>
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LandingPage;
