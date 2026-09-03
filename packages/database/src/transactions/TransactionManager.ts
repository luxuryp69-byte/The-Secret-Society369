import type { Transaction } from "../contracts/Transaction";

export class TransactionManager implements Transaction {

    async begin(): Promise<void> {
        console.log("Transaction started");
    }

    async commit(): Promise<void> {
        console.log("Transaction committed");
    }

    async rollback(): Promise<void> {
        console.log("Transaction rolled back");
    }

}
