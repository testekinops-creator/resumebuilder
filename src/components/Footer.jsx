import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-links">
          <a href="#terms">Terms &amp; Conditions</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#accessibility">Accessibility</a>
          <a href="#contact">Contact Us</a>
        </div>
        <p className="footer-copyright">© 2026, Resume Builder. All rights reserved.</p>
      </div>
    </footer>
  );
}
