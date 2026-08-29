import express from 'express'
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.ts";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient();

const route = express.Router()



// Registro de usuario
route.post("/register", async (req, res) => {

    let {name, email, password, accessKey} = req.body
    
    // Chaves de accesso
    const accessKeysMap = {
        [process.env.COORDENADOR_KEY]: "coordenador",
        [process.env.FORMADOR_KEY]: "formador",
        [process.env.FORMANDO_KEY]: "formando"
    }

    // Validar acesso
    let validKey = accessKeysMap[accessKey]
    console.log(validKey)
    if(!validKey){
        return res.status(401).json({ message: `Invalid access key ${validKey}`})
        console.log('Valid Key', validKey )
    }

    // Encriptar senha
    let salt = await bcrypt.genSalt(10)


    try {
        let userRegist = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: await bcrypt.hash(password, salt),
                role: validKey
            }  
        })
        res.status(201).json({ message: 'Registado com sucesso!', userRegist })
        
    } catch (error) {
        res.status(500).json({message: 'Erro ao registrar usuário!'})
        console.log(error)
    }
})


// Login do usuario
route.post('/login', async (req, res) => {

    
    try {
        // Buscar user por email
        let userLogin = await prisma.user.findUnique({
            where: {
                email: req.body.email
            }
        })
        
        // Verificar se ele existe
        if (!userLogin) {
            return res.status(404).json({ message: 'Usuário não encontrado!' })
        }

        
        // Comparar a senha 
        let isMatch = await bcrypt.compare(req.body.password, userLogin.password)

        // Verificar se combina
        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta!' })
        }

        // Gerar token e fazer login
        let token = jwt.sign({ email: req.body.email, role: userLogin.role }, process.env.SECRET_KEY, { expiresIn: '1h' })

        res.status(200).json({ message: 'Login realizado com sucesso!', 
            token,
            role: userLogin.role
        })

        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Erro ao fazer login!' })
    }

    
})

// Deletar usuario
route.delete("/list/:id", async (req, res) => {
    let user = await prisma.user.findUnique({
        where: {
            id: req.params.id
        }
    })
})


export default route
export { prisma };