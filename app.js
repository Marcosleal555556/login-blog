const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

// Configurar a conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'phpmyadmin',
    password: 'marcos',
    database: 'mydb',
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        throw err;
    }
    console.log('Conexão com o banco de dados MySQL estabelecida.');
});

// Configurar a sessão
app.use(
    session({
        secret: 'Escreva aqui a senha para criptografar as sessões.',
        resave: true,
        saveUninitialized: true,
    })
);

// Configuração de pastas com aquivos estáticos
//app.use('/img', express.static(__dirname + '/img'))
app.use('/', express.static(__dirname + '/static'));

// Engine do Express para processar o EJS (templates)
// Lembre-se que para uso do EJS uma pasta (diretório) 'views', precisa existir na raiz do projeto.
// E que todos os EJS serão processados a partir desta pasta
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar EJS como o motor de visualização
app.set('view engine', 'ejs');

// Configuração das rotas do servidor HTTP
// A lógica ddo processamento de cada rota deve ser realizada aqui
app.get('/', (req, res) => {
    // Passe a variável 'req' para o template e use-a nas páginas para renderizar partes do HTML conforme determinada condição
    // Por exemplo de o usuário estive logado, veja este exemplo no arquivo views/partials/header.ejs
    // res.render('pages/index', { req: req });
    res.redirect('/posts');
    // Caso haja necessidade coloque pontos de verificação para verificar pontos da sua logica de negócios
    console.log(`${req.session.username ? `Usuário ${req.session.username} logado no IP ${req.connection.remoteAddress}` : 'Usuário não logado.'}  `);
    //console.log(req.connection)
    ;
});

// Rota para a página de login
app.get('/login', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON
    res.render('pages/login', { req: req });
});


app.get('/about', (req, res) => {
    res.render('pages/about', { req: req });
});

app.get('/posts', (req, res) => {
    const query = 'SELECT * FROM Postagens;'

    // Consulta para contar o número total de postagens
    db.query('SELECT COUNT(*) AS totalPosts FROM Postagens', (err, countResults) => {
        if (err) throw err;

        db.query(query, [], (err, results) => {
            if (err) throw err;
            const totalPosts = countResults[0].totalPosts; // Extrai o total de postagens da consulta de contagem
            res.render('pages/pgposts', { req: req, posts: results, totalPosts: totalPosts });
        });
    });
});


// Rota para processar o formulário de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';

    db.query(query, [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/dashboard');
        } else {
            // res.send('Credenciais incorretas. <a href="/">Tente novamente</a>');
            res.redirect('/login_failed');
        }
    });
});

// Rota para processar o formulário de caastro depostagem
app.post('/cadastrar_posts', (req, res) => {
    const { titulo, conteudo } = req.body;
    const autor = req.session.username; // Modifique esta linha

    const datapostagem = new Date();

    const query = 'INSERT INTO Postagens (titulo, conteudo, autor, datapostagem) VALUES (?, ?, ?, ?)';

    db.query(query, [titulo, conteudo, autor, datapostagem], (err, results) => {
        if (err) throw err;
        console.log(`Rotina cadastrar posts: ${JSON.stringify(results)}`);
        if (results.affectedRows > 0) {
            console.log('Cadastro de postagem OK')
            res.redirect('/dashboard');
        } else {
            res.send('Cadastro de post não efetuado');
        }
    });
});

app.post('/delete_post/:id', (req, res) => {
    const postId = req.params.id;
    const username = req.session.username;

    // Verifica se o usuário logado é o autor da postagem ou um administrador
    db.query('SELECT * FROM posts WHERE id = ? AND (autor = ? OR autor = "admin")', [postId, username], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Exclui a postagem do banco de dados
            db.query('DELETE FROM Postagens WHERE id = ?', [postId], (err, result) => {
                if (err) throw err;
                console.log(`Postagem com id ${postId} excluída com sucesso.`);
                res.redirect('/posts');
            });
        } else {
            console.log(`Usuário ${username} não tem permissão para excluir a postagem com id ${postId}.`);
            res.redirect('/posts');
        }
    });
});


// Rota para exibir a página de edição de postagem
app.get('/edit/:postId', (req, res) => {
    const postId = req.params.postId;
    const query = 'SELECT * FROM Postagens WHERE id = ?';
    db.query(query, [postId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const post = results[0];
            res.render('pages/edit_post', { req: req, post: post });
        } else {
            res.status(404).send('Postagem não encontrada.');
        }
    });
});

// Rota para processar a edição da postagem
app.post('/edit/:postId', (req, res) => {
    const postId = req.params.postId;
    const { titulo, conteudo } = req.body;
    const query = 'UPDATE Postagens SET titulo = ?, conteudo = ? WHERE id = ?';
    db.query(query, [titulo, conteudo, postId], (err, result) => {
        if (err) throw err;
        res.redirect('/'); // Redirecionar para a página inicial após a edição
    });
});




// const query = 'INSERT INTO users (username, password) VALUES (?, SHA1(?))';
// console.log(`POST /CADASTRAR -> query -> ${query}`);
// db.query(query, [username, password], (err, results) => {
//     console.log(results);
//     //console.log(`POST /CADASTAR -> results -> ${results}`);

//     if (err) {
//         console.log(`ERRO NO CADASTRO: ${err}`);
//         throw err;
//     }
//     if (results.affectedRows > 0) {
//         req.session.loggedin = true;
//         req.session.username = username;
//         res.redirect('/register_ok');
//     }
// });


// Rota para a página cadastro do post
app.get('/cadastrar_posts', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON
    if (req.session.loggedin) {
        res.render('pages/cadastrar_posts', { req: req });
    } else {
        res.redirect('/login_failed');
    }
});

// Rotas para cadastrar
app.get('/cadastrar', (req, res) => {
    if (!req.session.loggedin) {
        res.render('pages/cadastrar', { req: req });
    } else {
        res.redirect('pages/dashboard', { req: req });
    }
});

// Rota para efetuar o cadastro de usuário no banco de dados
app.post('/cadastrar', (req, res) => {
    const { username, password } = req.body;

    // Verifica se o usuário já existe
    const query = 'INSERT INTO users (username, password) VALUES (?, SHA1(?))';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            // Verifica se o erro é devido a uma violação da restrição de username único
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('users.unique_username')) {
                return res.redirect('/register_failed');
            } else {
                // Se o erro não for devido a um username duplicado, envia uma mensagem genérica de erro
                console.error('Erro no cadastro:', err);
                return res.send('Ocorreu um erro ao cadastrar o usuário. Por favor, tente novamente mais tarde.');
            }
        }
        
        console.log('Usuário cadastrado com sucesso:', username);
        res.redirect('/register_ok');
    });
});

app.get('/register_failed', (req, res) => {
    res.render('pages/register_failed', { req: req });
});

app.get('/register_ok', (req, res) => {
    res.render('pages/register_ok', { req: req });
});

app.get('/login_failed', (req, res) => {
    res.render('pages/login_failed', { req: req });
});

// Rota para a página do painel
app.get('/dashboard', (req, res) => {
    //
    //modificação aqui
    if (req.session.loggedin) {
        //res.send(`Bem-vindo, ${req.session.username}!<br><a href="/logout">Sair</a>`);
        // res.sendFile(__dirname + '/index.html');
        res.render('pages/dashboard', { req: req });
    } else {
        res.send('Faça login para acessar esta página. <a href="/">Login</a>');
    }
});

// Rota para processar a saida (logout) do usuário
// Utilize-o para encerrar a sessão do usuário
// Dica 1: Coloque um link de 'SAIR' na sua aplicação web
// Dica 2: Você pode implementar um controle de tempo de sessão e encerrar a sessão do usuário caso este tempo passe.
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Rota de teste
app.get('/teste', (req, res) => {
    res.render('pages/teste', { req: req });
});


app.listen(3000, () => {
    console.log('----Login (MySQL version)-----')
    console.log('Servidor rodando na porta 3000');
});