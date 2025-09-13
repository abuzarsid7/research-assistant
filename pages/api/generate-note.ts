import type { NextApiRequest, NextApiResponse } from 'next';

type ResearchRequest = {
  query: string;
};

type ResearchResponse = {
  note: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResearchResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body as ResearchRequest;

  if (!query) {
    return res.status(400).json({ error: 'No query provided for research.' });
  }

  try {
    // In a real application, you would use the query to call the Gemini API
    // and generate a detailed note based on the research topic.
    const geminiResponse = await new Promise<string>((resolve) => {
      setTimeout(() => {
        const simulatedNote = `**Research Findings for: "${query}"**\n\nBased on our simulated research, here are the key points regarding your query:\n\n*   **Initial Observation:** The topic of "${query}" is multifaceted, with significant implications in its respective field.\n*   **Key Aspect 1:** A major component of this topic is its historical context, which has shaped its current state.\n*   **Key Aspect 2:** Current trends indicate a growing interest and development in areas related to "${query}".\n*   **Future Outlook:** The future of "${query}" appears promising, with several potential avenues for innovation and further research.\n\nThis is a high-level summary. For a deeper dive, specific sub-topics should be explored.`;
        resolve(simulatedNote);
      }, 1500); // Simulate API call delay
    });

    res.status(200).json({ note: geminiResponse });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate research note from Gemini API.' });
  }
}
