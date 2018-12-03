interface EACAddresses {
  baseScheduler: string;
  blockScheduler: string;
  claimLib: string;
  executionLib: string;
  iterTools: string;
  mathLib: string;
  paymentLib: string;
  requestFactory: string;
  requestLib: string;
  requestMetaLib: string;
  requestScheduleLib: string;
  safeMath: string;
  timestampScheduler: string;
  transactionRecorder: string;
  transactionRequestCore: string;
}

declare module '*1002.json' {
  const value: EACAddresses;
  export = value;
}

declare module '*42.json' {
  const value: EACAddresses;
  export = value;
}
