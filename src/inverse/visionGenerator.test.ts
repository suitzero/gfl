import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisionProgramGenerator, type VisionTransport, type Message, type VisionTransportConfig } from './visionGenerator';

class MockVisionTransport implements VisionTransport {
  public messagesSent: Message[][] = [];
  public responsesToReturn: string[] = [];
  
  async send(messages: Message[], _config: VisionTransportConfig): Promise<string> {
    this.messagesSent.push([...messages]);
    const response = this.responsesToReturn.shift();
    if (response === undefined) {
      throw new Error('No more responses mocked');
    }
    return response;
  }
}

describe('VisionProgramGenerator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const dummyContext = {
    targetImageBase64: 'dummybase64',
    grammarSummary: '(union (sphere) (box))'
  };

  it('throws an error if GFL_VISION_API_KEY is not set', async () => {
    delete process.env.GFL_VISION_API_KEY;
    const generator = new VisionProgramGenerator(new MockVisionTransport());
    
    await expect(generator.generate(dummyContext)).rejects.toThrow('GFL_VISION_API_KEY environment variable is required');
  });

  it('successfully generates a program when valid GFL is returned', async () => {
    process.env.GFL_VISION_API_KEY = 'test_key';
    const mockTransport = new MockVisionTransport();
    mockTransport.responsesToReturn.push('(sphere :r 1.0)');
    
    const generator = new VisionProgramGenerator(mockTransport);
    const result = await generator.generate(dummyContext);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('sphere');
    expect(result.params.r).toBe(1.0);
    
    expect(mockTransport.messagesSent.length).toBe(1);
    const messages = mockTransport.messagesSent[0];
    expect(messages[0].role).toBe('system');
    if (typeof messages[0].content === 'string') {
        expect(messages[0].content).toContain(dummyContext.grammarSummary);
    }
  });

  it('triggers a retry when the parser fails, and succeeds on the second attempt', async () => {
    process.env.GFL_VISION_API_KEY = 'test_key';
    const mockTransport = new MockVisionTransport();
    // First response is invalid GFL
    mockTransport.responsesToReturn.push('(sphere :r 1.0'); 
    // Second response is valid GFL
    mockTransport.responsesToReturn.push('(sphere :r 1.0)');
    
    const generator = new VisionProgramGenerator(mockTransport);
    const result = await generator.generate(dummyContext);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('sphere');
    
    expect(mockTransport.messagesSent.length).toBe(2);
    
    // Check that the retry message contains the error
    const retryMessages = mockTransport.messagesSent[1];
    const lastMessage = retryMessages[retryMessages.length - 1];
    expect(lastMessage.role).toBe('user');
    expect(typeof lastMessage.content).toBe('string');
    expect((lastMessage.content as string)).toContain('The GFL parser threw an error:');
  });

  it('throws ParseError if the retry also fails', async () => {
    process.env.GFL_VISION_API_KEY = 'test_key';
    const mockTransport = new MockVisionTransport();
    mockTransport.responsesToReturn.push('(sphere :r 1.0'); 
    mockTransport.responsesToReturn.push('(sphere :r 1.0'); 
    
    const generator = new VisionProgramGenerator(mockTransport);
    await expect(generator.generate(dummyContext)).rejects.toThrow();
  });
});
