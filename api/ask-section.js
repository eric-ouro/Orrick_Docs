function compact(value, limit = 3200) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function collectOutputText(response) {
  if (response.output_text) return response.output_text;
  if (!Array.isArray(response.output)) return "";
  return response.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((part) => part && part.type === "output_text" && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured in this Vercel project." });
    return;
  }

  const body = req.body || {};
  const question = compact(body.question, 1200);
  if (!question) {
    res.status(400).json({ error: "Question is required." });
    return;
  }

  const issue = body.issue || {};
  const sections = Array.isArray(body.sections) ? body.sections : [];
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const context = {
    project: compact(body.project, 300),
    question,
    issue: {
      title: compact(issue.title, 500),
      type: compact(issue.issueType, 80),
      status: compact(issue.status, 80),
      priority: compact(issue.priority, 80),
      prompt: compact(issue.prompt, 1800),
      notes: compact(issue.details, 2400),
      provisionalAnswer: compact(issue.provisionalAnswer, 1800),
      currentAnswer: compact(issue.answer, 1800),
      proposedChange: compact(issue.proposedChange, 1800),
      followUpNotes: compact(issue.followUpNotes, 1800)
    },
    linkedSections: sections.map((section) => ({
      title: compact(section.title, 300),
      row: compact(section.row, 80),
      group: compact(section.group, 160),
      body: compact(section.body, 3000)
    }))
  };

  const instructions = [
    "You are a fund term-sheet drafting assistant working inside a legal review tracker.",
    "Use only the supplied issue, answer fields, and linked document sections.",
    "Do not invent facts or cite outside law. If missing facts matter, ask focused follow-up questions.",
    "Give practical drafting-review help for counsel: decision points, risks to confirm, and possible language only when the context supports it.",
    "Refer to linked sections by their supplied title or row where useful.",
    "Keep the answer concise and organized under short headings."
  ].join(" ");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions,
        input: [
          {
            role: "user",
            content: JSON.stringify(context, null, 2)
          }
        ],
        max_output_tokens: 1200
      })
    });

    const data = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) {
      const message = data.error?.message || `OpenAI request failed with ${openaiResponse.status}.`;
      res.status(openaiResponse.status).json({ error: message });
      return;
    }

    res.status(200).json({ answer: collectOutputText(data), model, responseId: data.id || "" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not reach OpenAI." });
  }
};
