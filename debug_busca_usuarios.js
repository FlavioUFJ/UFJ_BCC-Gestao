const databaseConfig = require('./src/config/database');
const db = databaseConfig;

console.log('Testando as queries de busca de usuários...');

// Testar a query da rota /admin/todos-usuarios
console.log('\n=== TESTANDO QUERY /admin/todos-usuarios ===');
const queryTodosUsuarios = `
    SELECT 
        p.id_pessoa,
        p.nome,
        p.email,
        pl.status,
        pl.tipoacesso,
        pl.dataultimaatualizacao
    FROM pessoa p
    INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
    WHERE p.nome LIKE '%Maria Eduarda%'
    ORDER BY p.nome
`;

db.all(queryTodosUsuarios, (err, usuarios) => {
    if (err) {
        console.error('Erro na query todos-usuarios:', err);
    } else {
        console.log('Usuários encontrados na query todos-usuarios:');
        console.log(usuarios);
        
        if (usuarios.length === 0) {
            console.log('❌ Maria Eduarda NÃO aparece na lista de todos os usuários!');
        } else {
            console.log('✅ Maria Eduarda APARECE na lista de todos os usuários!');
        }
    }
    
    // Testar a query da rota /admin/buscar-usuarios
    console.log('\n=== TESTANDO QUERY /admin/buscar-usuarios ===');
    const queryBuscarUsuarios = `
        SELECT 
            p.id_pessoa,
            p.nome,
            p.email,
            p.categoria,
            pl.tipoacesso,
            pl.status
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        WHERE (p.nome LIKE '%Maria Eduarda%' OR p.email LIKE '%Maria Eduarda%')
        ORDER BY p.nome
    `;
    
    db.all(queryBuscarUsuarios, (err, usuarios2) => {
        if (err) {
            console.error('Erro na query buscar-usuarios:', err);
        } else {
            console.log('Usuários encontrados na query buscar-usuarios:');
            console.log(usuarios2);
            
            if (usuarios2.length === 0) {
                console.log('❌ Maria Eduarda NÃO aparece na busca de usuários!');
            } else {
                console.log('✅ Maria Eduarda APARECE na busca de usuários!');
            }
        }
        
        // Verificar se há algum filtro adicional que pode estar excluindo ela
        console.log('\n=== VERIFICANDO POSSÍVEIS FILTROS ===');
        console.log('Status do login da Maria Eduarda:', usuarios.length > 0 ? usuarios[0].status : 'N/A');
        console.log('Tipo de acesso da Maria Eduarda:', usuarios.length > 0 ? usuarios[0].tipoacesso : 'N/A');
        
        db.close();
    });
});