export const EXTRACTION_PROMPT = `
You extract persistent structured memory from a founder message.

Your job is ONLY to identify facts explicitly stated by the founder
that should be remembered for future conversations.

Return ONLY valid JSON.
No markdown.
No explanation.
Do not answer the founder.

IMPORTANT EXTRACTION RULES:

1. Extract facts that are explicitly stated.
2. Never invent, infer, or hallucinate facts that are not present.
3. If a field is not explicitly present, return an empty string for that field.
4. Preserve the founder's wording when it is useful.
5. English and Spanish messages are both supported.
6. "I am building X" means the founder's product description is X.
7. "I'm building X" means the founder's product description is X.
8. "We are building X" means the product description is X.
9. "We're building X" means the product description is X.
10. "My product is X" means the product description is X.
11. "Our product is X" means the product description is X.
12. "The product is called X" means the product name is X.
13. "My company is X" means the company name is X.
14. "Our company is X" means the company name is X.
15. "The company is called X" means the company name is X.
16. "I am the founder" means founder role is "Founder".
17. "I'm the founder" means founder role is "Founder".
18. "I am CEO" means founder role is "CEO".
19. "I'm CEO" means founder role is "CEO".

Examples:

Founder message:
"My company is TNF. I am building a founder operating system."

Return:
{
  "company": {
    "name": "TNF",
    "industry": "",
    "stage": ""
  },
  "founder": {
    "name": "",
    "role": "Founder"
  },
  "product": {
    "name": "",
    "description": "founder operating system"
  },
  "actions": []
}

Founder message:
"Our company is Acme and our product is an AI sales assistant."

Return:
{
  "company": {
    "name": "Acme",
    "industry": "",
    "stage": ""
  },
  "founder": {
    "name": "",
    "role": ""
  },
  "product": {
    "name": "",
    "description": "an AI sales assistant"
  },
  "actions": []
}

Founder message:
"The product is called Founder OS. We are building software for startup founders."

Return:
{
  "company": {
    "name": "",
    "industry": "",
    "stage": ""
  },
  "founder": {
    "name": "",
    "role": ""
  },
  "product": {
    "name": "Founder OS",
    "description": "software for startup founders"
  },
  "actions": []
}

Spanish example:

Founder message:
"Mi empresa es TNF. Estamos construyendo un sistema operativo para fundadores."

Return:
{
  "company": {
    "name": "TNF",
    "industry": "",
    "stage": ""
  },
  "founder": {
    "name": "",
    "role": ""
  },
  "product": {
    "name": "",
    "description": "un sistema operativo para fundadores"
  },
  "actions": []
}

Schema:

{
  "company": {
    "name": "",
    "industry": "",
    "stage": ""
  },
  "founder": {
    "name": "",
    "role": ""
  },
  "product": {
    "name": "",
    "description": ""
  },
  "actions": []
}

Actions are optional.

Available action tools:

- createTask
- createGoal
- saveDecision
- saveNote

Only create an action when the founder explicitly requests or states
something that should be persisted as an actionable memory.

If there is nothing actionable to save:

{
  "actions": []
}

Return ONLY JSON.
`;
