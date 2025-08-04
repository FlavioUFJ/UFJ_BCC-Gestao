const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Testando as modificações na listagem de usuários...');

// Testar a nova query da rota /admin/usuarios (sem INNER JOIN com usuario_modulos)
const novaQuery = `
    SELECT DISTINCT
        p.id_pessoa,
        p.nome,
        p.email,
        pl.status,
        pl.tipoacesso,
        pl.dataultimaatualizacao
    FROM pessoa p
    INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
    ORDER BY p.nome
`;

console.log('\n=== TESTANDO NOVA QUERY (SEM FILTRO DE MÓDULOS) ===');
db.all(novaQuery, (err, usuarios) => {
    if (err) {
        console.error('Erro na nova query:', err);
    } else {
        console.log(`Total de usuários encontrados: ${usuarios.length}`);
        
        // Procurar especificamente por Maria Eduarda
        const mariaEduarda = usuarios.find(u => u.nome.includes('Maria Eduarda'));
        if (mariaEduarda) {
            console.log('\n✅ MARIA EDUARDA ENCONTRADA!');
            console.log('Dados:', mariaEduarda);
        } else {
            console.log('\n❌ Maria Eduarda não encontrada');
        }
        
        // Mostrar todos os usuários para verificação
        console.log('\n=== LISTA COMPLETA DE USUÁRIOS ===');
        usuarios.forEach((usuario, index) => {
            console.log(`${index + 1}. ${usuario.nome} (${usuario.email}) - Status: ${usuario.status}, Tipo: ${usuario.tipoacesso}`);
        });
    }
    
    // Comparar com a query antiga (com INNER JOIN)
    console.log('\n=== COMPARANDO COM QUERY ANTIGA (COM FILTRO DE MÓDULOS) ===');
    const queryAntiga = `
        SELECT DISTINCT
            p.id_pessoa,
            p.nome,
            p.email,
            pl.status,
            pl.tipoacesso,
            pl.dataultimaatualizacao
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        INNER JOIN usuario_modulos um ON p.id_pessoa = um.id_pessoa
        WHERE um.ativo = 1
        ORDER BY p.nome
    `;
    
    db.all(queryAntiga, (err, usuariosAntigos) => {
        if (err) {
            console.error('Erro na query antiga:', err);
        } else {
            console.log(`Query antiga retornava: ${usuariosAntigos.length} usuários`);
            console.log(`Query nova retorna: ${usuarios.length} usuários`);
            console.log(`Diferença: +${usuarios.length - usuariosAntigos.length} usuários`);
            
            // Encontrar usuários que agora aparecem mas não apareciam antes
            const novosUsuarios = usuarios.filter(u => 
                !usuariosAntigos.some(ua => ua.id_pessoa === u.id_pessoa)
            );
            
            if (novosUsuarios.length > 0) {
                console.log('\n=== USUÁRIOS QUE AGORA APARECEM NA LISTA ===');
                novosUsuarios.forEach(usuario => {
                    console.log(`- ${usuario.nome} (${usuario.email}) - Status: ${usuario.status}, Tipo: ${usuario.tipoacesso}`);
                });
            }
        }
        
        db.close();
    });
});