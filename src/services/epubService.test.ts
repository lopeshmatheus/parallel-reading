import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseEpub } from './epubService';

describe('epubService - parseEpub', () => {
  it('should parse an epub file and return its chapters', async () => {
    // Scaffold a fake valid EPUB zip file using JSZip
    const zip = new JSZip();
    
    // 1. META-INF/container.xml
    const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.file("META-INF/container.xml", containerXml);
    
    // 2. OEBPS/content.opf
    const contentOpf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.html" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`;
    zip.file("OEBPS/content.opf", contentOpf);
    
    // 3. OEBPS/chapter1.html
    const chapter1Html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title></head>
<body><h1>Chapter 1</h1><p>Hello world. This is test.</p></body>
</html>`;
    zip.file("OEBPS/chapter1.html", chapter1Html);
    
    // 4. OEBPS/chapter2.html
    const chapter2Html = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2</title></head>
<body><h1>Chapter 2</h1><p>Another chapter here.</p></body>
</html>`;
    zip.file("OEBPS/chapter2.html", chapter2Html);

    // Create the Blob/File
    const zipContent = await zip.generateAsync({ type: "blob" });
    const epubFile = new File([zipContent], "test.epub", { type: "application/epub+zip" });

    // Call parseEpub
    const book = await parseEpub(epubFile);

    expect(book.title).toBe('Test Book');
    expect(book.chapters.length).toBe(2);
    expect(book.chapters[0].id).toBe('chapter1');
    expect(book.chapters[0].htmlContent).toContain('Hello world');
  });
});
