export interface Refinable<T> {
  value: T;
  errorBound?: number;
  cost: number;
  interval?: [T, T];
  refine(budget: number): T;
}

export class RefinableIntervalNumber implements Refinable<number> {
  public value: number;
  public errorBound: number;
  public cost: number;
  public interval?: [number, number];
  private exactValue: number;
  private initialWidth: number;

  constructor(exactValue: number, initialWidth: number = 1.0, initialBudget: number = 1) {
    this.exactValue = exactValue;
    this.initialWidth = initialWidth;
    this.value = 0;
    this.errorBound = 0;
    this.cost = 0;
    this.refine(initialBudget);
  }

  refine(budget: number): number {
    if (budget < 1) budget = 1;
    
    // Width shrinks monotonically with increasing budget
    const currentWidth = this.initialWidth / budget;
    const halfWidth = currentWidth / 2;
    
    this.interval = [this.exactValue - halfWidth, this.exactValue + halfWidth];
    this.errorBound = halfWidth;
    this.cost = budget;
    
    // Return coarse-to-fine value (we use the upper bound for simulation to visibly change)
    this.value = this.interval[1];
    
    return this.value;
  }
}

export class RefinableRadius implements Refinable<number> {
  public value: number;
  public errorBound: number;
  public cost: number;
  private exactRadius: number;

  constructor(exactRadius: number, initialBudget: number = 1) {
    this.exactRadius = exactRadius;
    this.value = 0;
    this.errorBound = 0;
    this.cost = 0;
    this.refine(initialBudget);
  }

  refine(budget: number): number {
    // A simple simulation where higher budget reduces error and increases cost
    // We start with a large error, and it decreases asymptotically towards 0 as budget increases.
    // e.g. errorBound = 1 / budget.
    // cost = budget
    // value = exactRadius + error (we'll just use exactRadius + errorBound for simplicity, 
    // but a real implementation might approximate differently. Let's say value = exactRadius + errorBound).

    if (budget < 1) budget = 1;
    
    this.errorBound = 1 / budget;
    this.cost = budget;
    this.value = this.exactRadius + this.errorBound;
    
    return this.value;
  }
}
