import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GuidePage, PrivacyPage } from './App.js';
import './styles.css';

document.documentElement.classList.add('js');

const root = document.querySelector('#root');
if (!(root instanceof HTMLElement)) {
  throw new Error('Website root is missing');
}

const isPrivacyPage = window.location.pathname.endsWith('/privacy.html');

createRoot(root).render(
  <StrictMode>{isPrivacyPage ? <PrivacyPage /> : <GuidePage />}</StrictMode>,
);
