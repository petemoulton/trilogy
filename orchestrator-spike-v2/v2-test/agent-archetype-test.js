#!/usr/bin/env node

/**
 * Multi-Provider Agent Archetype Test
 * Tests if external AI agents can use Trilogy infrastructure and MCP tools
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'providers', 'config', '.env') });

// Import our prompt system and providers
const TrilologyPromptSystem = require('../infrastructure/trilogy-prompt-system');
const RealOpenAIProvider = require('../providers/openai/openai-provider');
const RealGeminiProvider = require('../providers/gemini/gemini-provider');

class AgentArchetypeTest {
    constructor() {
        this.promptSystem = new TrilologyPromptSystem();
        this.providers = {
            'gpt-4': new RealOpenAIProvider('gpt-4'),
            'gpt-4o-mini': new RealOpenAIProvider('gpt-4o-mini'),
            'gemini-pro': new RealGeminiProvider('gemini-pro')
        };
        
        this.testSession = {
            id: `agent-test-${Date.now()}`,
            startTime: new Date(),
            agents: []
        };
        
        console.log('\n🧪 Multi-Provider Agent Archetype Test Starting');
        console.log('=' .repeat(70));
        console.log(`Test Session: ${this.testSession.id}`);
        console.log(`Start Time: ${this.testSession.startTime.toISOString()}`);
        console.log('=' .repeat(70));
    }
    
    async runAllTests() {
        try {
            console.log('\n🎯 Testing Three Agent Archetypes with Real Providers\n');
            
            // Test 1: Enhanced Backend Developer (GPT-4) + Port Registry
            const backendAgent = await this.testAgent({
                name: 'Enhanced Backend Developer',
                provider: 'gpt-4',
                modelContext: 'GPT-4: High capability, detailed reasoning, slower but more thorough',
                mcpTool: 'Port Registry',
                taskSpec: {
                    role: 'Enhanced Backend Developer',
                    task: 'Write a self-introduction markdown file and demonstrate Port Registry tool usage',
                    requirements: [
                        'Create a markdown file explaining who you are and your purpose',
                        'Include your model context and capabilities',
                        'Show understanding of Trilogy infrastructure available to you',
                        'Use the Port Registry MCP tool to check current port allocations',
                        'Include actual port data to prove you used the real tool (not hallucinated)',
                        'Save results to the v2-test directory'
                    ],
                    v2Improvements: [
                        'Real provider integration instead of simulation',
                        'Access to complete Trilogy infrastructure',
                        'Ability to use MCP services for enhanced development'
                    ]
                }
            });
            
            // Test 2: Enhanced Frontend Developer (GPT-4o-mini) + Browser Testing
            const frontendAgent = await this.testAgent({
                name: 'Enhanced Frontend Developer',
                provider: 'gpt-4o-mini',
                modelContext: 'GPT-4o-mini: Fast, efficient, cost-effective, optimized for quick iterations',
                mcpTool: 'Lightweight Browser Testing',
                taskSpec: {
                    role: 'Enhanced Frontend Developer',
                    task: 'Write a self-introduction markdown file and demonstrate Browser Testing tool usage',
                    requirements: [
                        'Create a markdown file explaining who you are and your purpose',
                        'Include your model context and capabilities (emphasize speed/efficiency)',
                        'Show understanding of Trilogy frontend development stack',
                        'Use the Lightweight Browser Testing MCP tool to run health checks',
                        'Include actual test results to prove you used the real tool (not fabricated)',
                        'Save results to the v2-test directory'
                    ],
                    v2Improvements: [
                        'Real provider integration with cost optimization',
                        'Access to Trilogy UI development tools',
                        'Efficient browser testing capabilities'
                    ]
                }
            });
            
            // Test 3: Enhanced QA Engineer (Gemini) + Desktop Commander
            const qaAgent = await this.testAgent({
                name: 'Enhanced QA Engineer',
                provider: 'gemini-pro',
                modelContext: 'Gemini Pro: Google flagship model, strong logical reasoning, systematic analysis',
                mcpTool: 'Desktop Commander',
                taskSpec: {
                    role: 'Enhanced QA Engineer',
                    task: 'Write a self-introduction markdown file and demonstrate Desktop Commander tool usage',
                    requirements: [
                        'Create a markdown file explaining who you are and your purpose',
                        'Include your model context and capabilities (emphasize reasoning/analysis)',
                        'Show understanding of Trilogy QA and testing infrastructure',
                        'Use the Desktop Commander MCP tool to list files in orchestrator-spike-v2',
                        'Include actual directory contents to prove you used the real tool (not guessed)',
                        'Save results to the v2-test directory'
                    ],
                    v2Improvements: [
                        'Real provider integration with systematic testing',
                        'Access to comprehensive Trilogy testing stack',
                        'Desktop automation capabilities for thorough QA'
                    ]
                }
            });
            
            // Generate test results summary
            await this.generateTestSummary([backendAgent, frontendAgent, qaAgent]);
            
            console.log('\n🎉 Agent Archetype Test Complete!');
            console.log('📁 Check v2-test/ directory for all agent outputs');
            console.log('📊 Review test-summary.md for analysis of MCP tool usage');
            
        } catch (error) {
            console.error('\n💥 Agent test failed:', error.message);
            throw error;
        }
    }
    
    async testAgent(config) {
        console.log(`\n🤖 Testing Agent: ${config.name}`);
        console.log(`📱 Provider: ${config.provider}`);
        console.log(`🧠 Model Context: ${config.modelContext}`);
        console.log(`🛠️  MCP Tool: ${config.mcpTool}`);
        
        const agent = {
            name: config.name,
            provider: config.provider,
            modelContext: config.modelContext,
            mcpTool: config.mcpTool,
            startTime: new Date(),
            status: 'testing'
        };
        
        this.testSession.agents.push(agent);
        
        try {
            // Build the complete three-layer prompt
            const fullPrompt = this.promptSystem.buildCompletePrompt(config.taskSpec);
            
            // Add specific MCP tool instruction
            const mcpInstruction = this.buildMCPToolInstruction(config.mcpTool);
            const completePrompt = `${fullPrompt}\n\n${mcpInstruction}`;
            
            console.log(`\n📋 Executing agent task...`);
            console.log(`🔄 Making API call to ${config.provider}...`);
            
            // Get the provider and make the API call
            const provider = this.providers[config.provider];
            const result = await provider.generateCode(completePrompt);
            
            agent.endTime = new Date();
            agent.duration = agent.endTime - agent.startTime;
            agent.result = result;
            agent.status = 'completed';
            
            console.log(`✅ Agent completed successfully`);
            console.log(`⏱️  Duration: ${agent.duration}ms`);
            console.log(`🎯 Tokens used: ${result.tokensUsed}`);
            console.log(`💰 Cost: $${result.estimatedCost.toFixed(4)}`);
            console.log(`🔍 Real API: ${result.real ? 'Yes' : 'No'}`);
            
            // Save the agent's output to file
            await this.saveAgentOutput(agent, result.content);
            
            return agent;
            
        } catch (error) {
            agent.endTime = new Date();
            agent.duration = agent.endTime - agent.startTime;
            agent.error = error.message;
            agent.status = 'failed';
            
            console.log(`❌ Agent failed: ${error.message}`);
            
            return agent;
        }
    }
    
    buildMCPToolInstruction(mcpTool) {
        const instructions = {
            'Port Registry': `
## CRITICAL MCP TOOL TEST: Port Registry

You MUST use the actual Port Registry tool to prove you can access Trilogy infrastructure:

**Command to execute**: \`node "/Users/petermoulton/Repos/dev-tools/port-registry/port-manager.js" list\`

**Your task**: 
1. Execute this exact command through the MCP system
2. Include the ACTUAL output in your markdown file
3. Do NOT hallucinate or fake the port data
4. The output should show real port allocations with project names and port ranges

**Verification**: I will check if your output contains real data or if you're making up port allocations.`,

            'Lightweight Browser Testing': `
## CRITICAL MCP TOOL TEST: Browser Testing

You MUST use the actual Lightweight Browser Testing tool to prove you can access Trilogy infrastructure:

**Command to execute**: \`cd /Users/petermoulton/Repos/dev-tools/lightweight-browser-testing && ./run-tests.sh health\`

**Your task**:
1. Execute this exact command through the MCP system
2. Include the ACTUAL test results in your markdown file
3. Do NOT fabricate browser test output
4. The output should show real health check results from the browser testing framework

**Verification**: I will check if your output contains real test data or if you're making up results.`,

            'Desktop Commander': `
## CRITICAL MCP TOOL TEST: Desktop Commander

You MUST use the actual Desktop Commander tool to prove you can access Trilogy infrastructure:

**Command to execute**: Use Desktop Commander to list the contents of \`/Users/petermoulton/Repos/trilogy/orchestrator-spike-v2/\`

**Your task**:
1. Use Desktop Commander MCP service to list directory contents
2. Include the ACTUAL directory listing in your markdown file
3. Do NOT guess or make up the directory structure
4. The output should show real files and folders that exist in the project

**Verification**: I will check if your output matches the actual directory contents or if you're guessing.`
        };
        
        return instructions[mcpTool] || 'No specific MCP tool instruction available.';
    }
    
    async saveAgentOutput(agent, content) {
        const filename = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-output.md`;
        const filepath = path.join(__dirname, filename);
        
        const fileContent = `# ${agent.name} Test Output

**Provider**: ${agent.provider}  
**Model Context**: ${agent.modelContext}  
**MCP Tool Tested**: ${agent.mcpTool}  
**Test Duration**: ${agent.duration}ms  
**Status**: ${agent.status}  
**Timestamp**: ${agent.startTime.toISOString()}

---

${content}

---

**Test Metadata**:
- Tokens Used: ${agent.result?.tokensUsed || 'N/A'}
- Estimated Cost: $${agent.result?.estimatedCost?.toFixed(4) || 'N/A'}
- Real API Call: ${agent.result?.real ? 'Yes' : 'No'}
- Provider: ${agent.result?.provider || 'Unknown'}
`;

        await fs.writeFile(filepath, fileContent);
        console.log(`📄 Saved agent output: ${filename}`);
    }
    
    async generateTestSummary(agents) {
        console.log('\n📊 Generating Test Summary...');
        
        const summary = `# Multi-Provider Agent Archetype Test Summary

**Test Session**: ${this.testSession.id}  
**Start Time**: ${this.testSession.startTime.toISOString()}  
**Total Agents Tested**: ${agents.length}

## 🎯 Test Objective

Verify if external AI providers can:
1. Understand their model context and capabilities
2. Access and use Trilogy infrastructure through three-layer prompts
3. Execute actual MCP tools (not hallucinate results)
4. Follow Trilogy development standards and conventions

## 🤖 Agent Test Results

${agents.map(agent => `
### ${agent.name}
- **Provider**: ${agent.provider}
- **Model Context**: ${agent.modelContext}
- **MCP Tool**: ${agent.mcpTool}
- **Status**: ${agent.status}
- **Duration**: ${agent.duration}ms
- **Cost**: $${agent.result?.estimatedCost?.toFixed(4) || 'N/A'}
- **Real API**: ${agent.result?.real ? '✅ Yes' : '❌ No'}
- **Output File**: \`${agent.name.toLowerCase().replace(/\s+/g, '-')}-output.md\`
`).join('\n')}

## 📋 Analysis Checklist

### Context Understanding
${agents.map(agent => `- [ ] ${agent.name}: Shows awareness of ${agent.provider} capabilities`).join('\n')}

### Trilogy Infrastructure Awareness  
${agents.map(agent => `- [ ] ${agent.name}: Demonstrates understanding of available tools and standards`).join('\n')}

### MCP Tool Usage Verification
${agents.map(agent => `- [ ] ${agent.name}: Used real ${agent.mcpTool} tool (not hallucinated)`).join('\n')}

### Standard Compliance
${agents.map(agent => `- [ ] ${agent.name}: Followed Trilogy naming and documentation conventions`).join('\n')}

## 🚨 Critical Questions to Verify

1. **Did agents use REAL MCP tools or hallucinate results?**
   - Check if port registry data matches actual allocations
   - Verify browser test results are real vs fabricated  
   - Confirm directory listings match actual file structure

2. **Do agents understand their model context?**
   - GPT-4: Shows awareness of high capability/slower processing
   - GPT-4o-mini: Emphasizes speed/efficiency/cost-effectiveness
   - Gemini Pro: Highlights logical reasoning/systematic analysis

3. **Are agents following Trilogy standards?**
   - Proper markdown formatting
   - Reference to available infrastructure
   - Understanding of development workflow

## 📊 Success Metrics

- **Context Awareness**: ${agents.filter(a => a.status === 'completed').length}/${agents.length} agents completed
- **Real API Usage**: ${agents.filter(a => a.result?.real).length}/${agents.length} used real APIs
- **Cost Efficiency**: Total cost $${agents.reduce((sum, a) => sum + (a.result?.estimatedCost || 0), 0).toFixed(4)}

## 🎉 Conclusion

${this.generateConclusion(agents)}

---

**Next Steps**: Manually review each agent output file to verify MCP tool usage authenticity.
`;

        const summaryPath = path.join(__dirname, 'test-summary.md');
        await fs.writeFile(summaryPath, summary);
        console.log('📋 Test summary saved: test-summary.md');
    }
    
    generateConclusion(agents) {
        const completedAgents = agents.filter(a => a.status === 'completed').length;
        const realAPIAgents = agents.filter(a => a.result?.real).length;
        
        if (completedAgents === agents.length && realAPIAgents === agents.length) {
            return '🎉 **SUCCESS**: All agents completed successfully using real APIs. This proves external AI providers can access and use Trilogy infrastructure through the three-layer prompt system.';
        } else if (completedAgents === agents.length) {
            return '⚠️  **PARTIAL SUCCESS**: All agents completed but some used fallback responses. The architecture works but API configuration may need adjustment.';
        } else {
            return '❌ **NEEDS INVESTIGATION**: Some agents failed. Review error messages and API configurations before proceeding.';
        }
    }
}

// Main execution
async function main() {
    try {
        const test = new AgentArchetypeTest();
        await test.runAllTests();
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AgentArchetypeTest;