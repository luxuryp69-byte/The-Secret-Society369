export interface Migration {

    id: string;

    description: string;

    execute(): Promise<void>;

}
