# API Keys Configuration Template

**INSTRUCTIONS**: Replace placeholders with actual API keys before use.

## Required API Keys for Multi-Provider Orchestration

**Google Gemini API Key**
```
[REPLACE_WITH_ACTUAL_GOOGLE_GEMINI_KEY]
```

**OpenAI API Key**
```
[REPLACE_WITH_ACTUAL_OPENAI_API_KEY]
```

**DeepSeek API Key** (Optional)
```
[REPLACE_WITH_ACTUAL_DEEPSEEK_KEY]
```

**Anthropic API Key** (Optional)
```
[REPLACE_WITH_ACTUAL_ANTHROPIC_KEY]
```

## Environment File Template

Create `.env` file in `provider-config/` directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=[REPLACE_WITH_ACTUAL_OPENAI_API_KEY]
OPENAI_ORG_ID=[YOUR_ORG_ID_IF_APPLICABLE]

# Google AI Configuration  
GEMINI_API_KEY=[REPLACE_WITH_ACTUAL_GOOGLE_GEMINI_KEY]
GEMINI_PROJECT_ID=[YOUR_PROJECT_ID_IF_APPLICABLE]

# Optional: Additional Providers
DEEPSEEK_API_KEY=[REPLACE_WITH_ACTUAL_DEEPSEEK_KEY]
ANTHROPIC_API_KEY=[REPLACE_WITH_ACTUAL_ANTHROPIC_KEY]
```

## Usage Notes

- This template prevents actual keys from being committed to git
- Real keys should be manually added when running the orchestration
- Keys are required for genuine multi-provider testing (not simulation)
- Keep keys secure and never commit them to public repositories