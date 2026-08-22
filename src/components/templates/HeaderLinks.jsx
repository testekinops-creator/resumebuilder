import { isValidURL } from '../../utils/sanitize';

export default function HeaderLinks({ contact = {}, websites = [] }) {
  const contactLinks = [contact.linkedIn, contact.website]
    .filter(url => url && isValidURL(url))
    .map((url, index) => ({ id: `contact-link-${index}`, url }));
  const profileLinks = websites.filter(site => site.addToHeader && site.url && isValidURL(site.url));
  const headerLinks = [...contactLinks, ...profileLinks];
  if (!headerLinks.length) return null;

  return headerLinks.map(site => (
    <a key={site.id} href={site.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
      {site.url.replace(/^https?:\/\//, '')}
    </a>
 ));
}
