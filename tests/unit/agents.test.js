const SonnetAgent = require('../../agents/sonnet-agent');
const OpusAgent = require('../../agents/opus-agent');

// Mock the fetch function for API calls
global.fetch = jest.fn();

describe('AI Agents', () => {
  describe('SonnetAgent', () => {
    let sonnetAgent;

    beforeEach(() => {
      sonnetAgent = new SonnetAgent();
      fetch.mockClear();
    });

    test('should initialize with correct properties', () => {
      expect(sonnetAgent.name).toBe('sonnet');
      expect(sonnetAgent.role).toBe('Task Breakdown Engine');
      expect(sonnetAgent.capabilities).toContain('PRD Analysis');
      expect(sonnetAgent.capabilities).toContain('Task Generation');
    });

    test('should analyze PRD content', async () => {
      const mockPRD = `
        # Test Project
        ## Overview
        This is a test project for AI agents.
        ## Objectives
        - Build AI system
        - Implement agents
        ## Features
        - Memory system
        - Task breakdown
      `;

      const result = await sonnetAgent.process({
        type: 'analyze_prd',
        prd: mockPRD
      });

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.overview).toBeDefined();
      expect(result.analysis.objectives).toBeDefined();
      expect(result.analysis.features).toBeDefined();
      expect(result.nextSteps).toBeDefined();
    });

    test('should generate task breakdown', async () => {
      const requirements = ['memory', 'agents', 'VS Code'];

      const result = await sonnetAgent.process({
        type: 'breakdown_tasks',
        requirements
      });

      expect(result.success).toBe(true);
      expect(result.taskBreakdown).toBeDefined();
      expect(result.taskBreakdown.tasks).toBeDefined();
      expect(Array.isArray(result.taskBreakdown.tasks)).toBe(true);
      expect(result.taskBreakdown.totalTasks).toBeGreaterThan(0);
    });

    test('should assess task feasibility', async () => {
      const mockTasks = [
        {
          id: 'TASK-1',
          title: 'Test Task',
          complexity: 'MEDIUM',
          estimatedHours: 8,
          dependencies: [],
          blockers: []
        }
      ];

      const result = await sonnetAgent.process({
        type: 'assess_feasibility',
        tasks: mockTasks
      });

      expect(result.success).toBe(true);
      expect(result.feasibilityAssessment).toBeDefined();
      expect(Array.isArray(result.feasibilityAssessment)).toBe(true);
      expect(result.feasibilityAssessment[0].feasibility).toBeDefined();
    });

    test('should handle generic input', async () => {
      const result = await sonnetAgent.process({
        type: 'unknown',
        data: 'test input'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sonnet Agent processed generic input');
      expect(result.suggestions).toBeDefined();
    });

    test('should handle processing errors', async () => {
      // Force an error by passing invalid input
      const result = await sonnetAgent.process(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('OpusAgent', () => {
    let opusAgent;

    beforeEach(() => {
      opusAgent = new OpusAgent();
      fetch.mockClear();
    });

    test('should initialize with correct properties', () => {
      expect(opusAgent.name).toBe('opus');
      expect(opusAgent.role).toBe('Decision-Making Core');
      expect(opusAgent.capabilities).toContain('Task Prioritization');
      expect(opusAgent.capabilities).toContain('Strategic Decision Making');
    });

    test('should finalize tasks from Sonnet', async () => {
      const mockTasks = [
        {
          id: 'TASK-1',
          title: 'High Priority Task',
          complexity: 'MEDIUM',
          priority: 'HIGH',
          category: 'Core System',
          estimatedHours: 8,
          dependencies: [],
          blockers: []
        },
        {
          id: 'TASK-2',
          title: 'Low Value Task',
          complexity: 'HIGH',
          priority: 'LOW',
          category: 'Nice to Have',
          estimatedHours: 20,
          dependencies: ['TASK-1'],
          blockers: ['Unknown dependency']
        }
      ];

      const result = await opusAgent.process({
        type: 'finalize_tasks',
        tasks: mockTasks
      });

      expect(result.success).toBe(true);
      expect(result.finalOutput).toBeDefined();
      expect(result.finalOutput.approved).toBeDefined();
      expect(result.finalOutput.rejected).toBeDefined();
      expect(result.finalOutput.modified).toBeDefined();
      expect(result.finalOutput.roadmap).toBeDefined();
    });

    test('should prioritize roadmap', async () => {
      const requirements = ['memory_system', 'agent_framework', 'vscode_extension'];

      const result = await opusAgent.process({
        type: 'prioritize_roadmap',
        requirements
      });

      expect(result.success).toBe(true);
      expect(result.prioritizedRequirements).toBeDefined();
      expect(Array.isArray(result.prioritizedRequirements)).toBe(true);
      expect(result.reasoning).toBeDefined();
    });

    test('should make decisions between options', async () => {
      const options = [
        { name: 'Option A', feasibility: 8, impact: 7, urgency: 6, resources: 5 },
        { name: 'Option B', feasibility: 6, impact: 9, urgency: 8, resources: 7 },
        { name: 'Option C', feasibility: 9, impact: 5, urgency: 4, resources: 8 }
      ];

      const result = await opusAgent.process({
        type: 'make_decision',
        options
      });

      expect(result.success).toBe(true);
      expect(result.decision).toBeDefined();
      expect(result.alternatives).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });

    test('should review Sonnet output', async () => {
      const mockAnalysis = {
        overview: 'Test analysis overview',
        objectives: ['Objective 1', 'Objective 2'],
        features: ['Feature 1', 'Feature 2'],
        complexity: 'MEDIUM',
        timeline: { phases: [], total: '4 weeks' }
      };

      const result = await opusAgent.process({
        type: 'review_sonnet_output',
        analysis: mockAnalysis
      });

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review.analysisQuality).toBeDefined();
      expect(result.review.strategicAlignment).toBeDefined();
      expect(result.approved).toBeDefined();
    });
  });

  describe('Agent Communication', () => {
    test('should handle WebSocket connection simulation', () => {
      const sonnetAgent = new SonnetAgent();
      const opusAgent = new OpusAgent();

      // Test message handling setup
      expect(sonnetAgent.messageHandlers.has('agent_trigger')).toBe(true);
      expect(opusAgent.messageHandlers.has('agent_trigger')).toBe(true);
    });
  });
});