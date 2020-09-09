/* eslint-disable */

const stripe = Stripe(
  'pk_test_51HOOaIC7EdJTNAoSYnCQwusUzfYoryO7H6XtfZXy09n5qP8kP2AH9rU18x5wlJRTWiU0ItTuXa4XuzTXcAT2Cn6F00T16BJ9mH'
);
import axios from 'axios';
import { showAlert } from './alerts.js';

export const bookTour = async (tourID) => {
  try {
    //* 1) GET checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourID}`);
    //* 2) Create Checkout Forms + Charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    // console.log(err);
    showAlert('error', 'Could not able to process! try again later');
  }
};
