const generatePaperId = (domain, count) => {
  // Convert domain to uppercase and take first 3 characters
  const domainPrefix = domain.substring(0, 3).toUpperCase();
  // Get current year
  const year = new Date().getFullYear();
  // Generate a 3-digit sequence number with leading zeros
  const sequence = String(count + 1).padStart(3, '0');
  return `${domainPrefix}${year}${sequence}`;
};

const importPapers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Group papers by domain to generate sequential IDs
    const domainCounts = {};

    // First pass: Count existing papers per domain
    const existingPapers = await Paper.find({}, 'domain paperId');
    existingPapers.forEach(paper => {
      const domain = paper.domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });

    const papers = [];
    for (const row of data) {
      const domain = row.domain;
      domainCounts[domain] = domainCounts[domain] || 0;
      
      const paperId = generatePaperId(domain, domainCounts[domain]);
      domainCounts[domain]++;

      const paper = {
        title: row.title,
        domain: domain,
        synopsis: row.synopsis,
        paperId: paperId,
        presenters: row.presenters.split(';').map(presenterStr => {
          const [name, email, phone] = presenterStr.split(',').map(s => s.trim());
          return { name, email, phone };
        })
      };
      papers.push(paper);
    }

    await Paper.insertMany(papers);

    res.status(200).json({
      success: true,
      message: 'Papers imported successfully',
      count: papers.length
    });
  } catch (error) {
    console.error('Error importing papers:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing papers',
      error: error.message
    });
  }
}; 