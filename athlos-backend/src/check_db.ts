import db from "./config/db";

async function main() {
    try {
        console.log("Querying database tables...");
        const result = await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`
        );
        console.log("Tables found:");
        console.log(result.rows);
        
        // Let's also check user schema details if table exists
        const userTable = result.rows.find((r: any) => r.table_name === "usuario");
        if (userTable) {
            console.log("\nQuerying 'usuario' column info...");
            const cols = await db.query(
                `SELECT column_name, data_type, is_nullable 
                 FROM information_schema.columns 
                 WHERE table_name = 'usuario';`
            );
            console.log(cols.rows);
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error executing query:", err);
        process.exit(1);
    }
}

main();
