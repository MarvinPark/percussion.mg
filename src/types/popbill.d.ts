declare module "popbill" {
  type PopbillError = {
    code?: string | number;
    message?: string;
  };

  type PopbillSuccess<T> = (result: T) => void;
  type PopbillErrorHandler = (error: PopbillError) => void;

  type PopbillConfig = {
    LinkID: string;
    SecretKey: string;
    IsTest?: boolean;
    defaultErrorHandler?: (error: PopbillError) => void;
  };

  type TaxinvoiceService = {
    getUnitCost: (
      corpNum: string,
      success: PopbillSuccess<number>,
      error: PopbillErrorHandler,
    ) => void;
    getChargeInfo: (
      corpNum: string,
      success: PopbillSuccess<Record<string, unknown>>,
      error: PopbillErrorHandler,
    ) => void;
    getCertificateExpireDate: (
      corpNum: string,
      success: PopbillSuccess<string>,
      error: PopbillErrorHandler,
    ) => void;
    registIssue: (
      corpNum: string,
      taxinvoice: Record<string, unknown>,
      success: PopbillSuccess<Record<string, unknown>>,
      error: PopbillErrorHandler,
    ) => void;
    getInfo: (
      corpNum: string,
      keyType: string,
      mgtKey: string,
      success: PopbillSuccess<Record<string, unknown>>,
      error: PopbillErrorHandler,
    ) => void;
    getPDFURL: (
      corpNum: string,
      keyType: string,
      mgtKey: string,
      success: PopbillSuccess<string>,
      error: PopbillErrorHandler,
    ) => void;
    sendEmail: (
      corpNum: string,
      keyType: string,
      mgtKey: string,
      receiverMail: string,
      success: PopbillSuccess<Record<string, unknown>>,
      error: PopbillErrorHandler,
    ) => void;
    cancelIssue: (
      corpNum: string,
      keyType: string,
      mgtKey: string,
      memo: string,
      success: PopbillSuccess<Record<string, unknown>>,
      error: PopbillErrorHandler,
    ) => void;
  };

  interface PopbillModule {
    config(config: PopbillConfig): void;
    TaxinvoiceService(): TaxinvoiceService;
  }

  const popbill: PopbillModule;
  export default popbill;
}
