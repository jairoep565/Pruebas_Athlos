import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';


dotenv.config();

class Database {
    // Variable estática privada para almacenar la única instancia
    private static instance: Database;
    private pool: Pool;

    // Constructor privado para evitar múltiples instancias
    private constructor() {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('❌ DATABASE_URL no está definida en el archivo .env');
        }

        console.log('🔧 Conectando a:', connectionString.replace(/:[^:@]+@/, ':****@'));

        this.pool = new Pool({
            connectionString,
            ssl: false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,

        });

        // Test de conexión inicial
        this.testConnection();
    }

    private async testConnection() {
        try {
            const client = await this.pool.connect();
            console.log('✅ Conexión Singleton exitosa a AthlosDB');
            client.release();
        } catch (err: any) {
            console.error('❌ Error conectando a la DB:', err.message);
        }
    }

    // Método estático para obtener la instancia única
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    // Método tipado para ejecutar queries
    public async query(text: string, params?: any[]): Promise<QueryResult> {
        const start = Date.now();
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`Ejecutado: { query: "${text}", duración: ${duration}ms, filas: ${res.rowCount} }`);
        return res;
    }
}

// Exportamos directamente la instancia generada
export default Database.getInstance();