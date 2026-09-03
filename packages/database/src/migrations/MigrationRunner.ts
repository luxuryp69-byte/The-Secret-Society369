import type { Migration } from "./Migration";

export class MigrationRunner {

    private readonly migrations: Migration[] = [];

    register(migration: Migration): void {
        this.migrations.push(migration);
    }

    async run(): Promise<void> {

        for (const migration of this.migrations) {
            await migration.execute();
        }

    }

}
