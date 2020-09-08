/* eslint-disable */
// /
import '@babel/polyfill';
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

// *DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logoutBtn = document.querySelector('.nav__el--logout');
const userUpdateForm = document.querySelector('.form-user-data');
const userPassUpdateForm = document.querySelector('.form-user-settings');
const bookBtn = document.getElementById('book-tour');

// *DELEGATIONS
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.location);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    logout();
  });
}

if (userUpdateForm) {
  userUpdateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    console.log(form);
    updateSettings(form, 'data');
  });
}

if (userPassUpdateForm) {
  userPassUpdateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn-password-save').textContent = 'Saving ...';
    const password = document.getElementById('password').value;
    const passwordCurrent = document.getElementById('password-current').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { password, passwordConfirm, passwordCurrent },
      'password'
    );
    password = '';
    passwordCurrent = '';
    passwordConfirm = '';
    document.querySelector('.btn-password-save').value = 'SAVE PASSWORD';
  });
}

if (bookBtn) {
  bookBtn.addEventListener(`click`, async (e) => {
    e.target.textContent = 'Processing ...';
    const tourId = e.target.dataset.tourId;
    await bookTour(tourId);
  });
}
