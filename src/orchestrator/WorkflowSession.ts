export class WorkflowSession {
  readonly goal: string;
  readonly startTime: Date;
  readonly history: string[] = [];

  constructor(goal: string) {
    this.goal = goal;
    this.startTime = new Date();
  }

  addHistory(entry: string): void {
    this.history.push(entry);
  }
}
