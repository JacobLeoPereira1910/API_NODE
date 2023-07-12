document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordButton = document.getElementById('toggle-password');
  const toggleConfirmPasswordButton = document.getElementById('toggle-confirm-password');
  const passwordInput = document.getElementById('password-reg');
  const confirmPasswordInput = document.getElementById('password-conf-reg');

  togglePasswordButton.addEventListener('click', togglePasswordVisibility);
  toggleConfirmPasswordButton.addEventListener('click', toggleConfirmPasswordVisibility);

  function togglePasswordVisibility() {
    togglePasswordVisibilityForElement(passwordInput, togglePasswordButton);
  }

  function toggleConfirmPasswordVisibility() {
    togglePasswordVisibilityForElement(confirmPasswordInput, toggleConfirmPasswordButton);
  }

  function togglePasswordVisibilityForElement(inputElement, toggleButton) {
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    toggleButton.innerHTML = `<i class="fa-regular fa-eye${type === 'text' ? '-slash' : ''}"></i>`;
    inputElement.focus();
  }
});
