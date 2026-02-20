import JSZip from 'jszip';

export interface Chapter {
  id: string;
  href: string;
  htmlContent: string;
}

export interface Book {
  title: string;
  chapters: Chapter[];
}

export const parseEpub = async (file: File | Blob): Promise<Book> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // 1. Get container.xml to find the rootfile (.opf)
  const containerXmlStr = await loadedZip.file('META-INF/container.xml')?.async('string');
  if (!containerXmlStr) throw new Error('Invalid EPUB: Missing META-INF/container.xml');

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXmlStr, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  if (!rootfile) throw new Error('Invalid EPUB: Missing rootfile in container.xml');
  
  const opfPath = rootfile.getAttribute('full-path');
  if (!opfPath) throw new Error('Invalid EPUB: rootfile missing full-path');

  // Directory of the opf file to resolve relative paths
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  // 2. Read the .opf file
  const opfXmlStr = await loadedZip.file(opfPath)?.async('string');
  if (!opfXmlStr) throw new Error(`Invalid EPUB: Missing opf file at ${opfPath}`);

  const opfDoc = parser.parseFromString(opfXmlStr, 'application/xml');
  
  // Try finding title (considering namespaces)
  const titleNodes = opfDoc.getElementsByTagNameNS('*', 'title');
  let title = 'Unknown Title';
  if (titleNodes.length > 0 && titleNodes[0].textContent) {
    title = titleNodes[0].textContent;
  } else {
    // Fallback if namespace query fails
    const dcTitle = opfDoc.querySelector('title');
    if (dcTitle && dcTitle.textContent) title = dcTitle.textContent;
  }

  // 3. Parse manifest
  const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));
  const manifestMap = new Map<string, string>();
  for (const item of manifestItems) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifestMap.set(id, href);
    }
  }

  // 4. Parse spine and get chapters
  const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'));
  const chapters: Chapter[] = [];

  for (const itemref of spineItems) {
    const idref = itemref.getAttribute('idref');
    if (!idref) continue;

    const href = manifestMap.get(idref);
    if (!href) continue;

    const chapterPath = opfDir ? `${opfDir}/${href}` : href;
    const htmlContent = await loadedZip.file(chapterPath)?.async('string');
    
    if (htmlContent) {
      chapters.push({
        id: idref,
        href: chapterPath,
        htmlContent
      });
    }
  }

  return {
    title,
    chapters
  };
};
