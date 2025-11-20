const https = require('https');
const { URL } = require('url');

const REMOTE_EXAM_BUTTON_ENDPOINT = 'https://supras.com/api/exam-button-config';

// Static fallback config captured from a working SUPRAS setup.
// We use the SUPRAS-style skin only for the PREVIOUS button and keep
// all other buttons using the default clearcoat styling.
const SUPRAS_BUTTON_IMAGE = 'data:image/png;base64,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';

const STATIC_BUTTON_CONFIG = {
  // Test footer buttons
  previous: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  next: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  mark: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  'mark-active': {
    image: null,
    useCustom: false,
    useImage: true,
    hidden: false,
  },
  review: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  exhibit: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  // Review footer buttons
  end: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  highlight: {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  'review-marked': {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  'review-all': {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
  'review-incomplete': {
    image: SUPRAS_BUTTON_IMAGE,
    useCustom: true,
    useImage: true,
    hidden: false,
  },
};

exports.handler = async function handler(event, context) {
  // Always return the static SUPRAS-style config. This makes the
  // frontend independent of the remote SUPRAS API and guarantees
  // that all buttons (test + review + highlight) use the same
  // SUPRAS skin consistently in production.
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(STATIC_BUTTON_CONFIG),
  };
};
