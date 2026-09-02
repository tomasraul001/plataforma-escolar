import express from 'express'
import "dotenv/config";
import prisma from "../../config/prisma.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"



const route = express.Router()



// Registro de usuario
export const register = async (req, res) => {

    let {name, email, password, accessKey} = req.body
    
    // Chaves de accesso
    const accessKeysMap = {
        [process.env.COORDENADOR_KEY]: "coordenador",
        [process.env.FORMADOR_KEY]: "formador",
        [process.env.FORMANDO_KEY]: "formando",
        [process.env.SECRETARIA_KEY]: "secretaria"
    }

    // Validar acesso
    let validKey = accessKeysMap[accessKey]
    if(!validKey){
        return res.status(401).json({ message: 'Chave de acesso inválida!' })
    }

    // Encriptar senha
    let salt = await bcrypt.genSalt(10)


    try {

        const userExist = await prisma.user.findUnique({
            where: {email: email.toLowerCase()}
        })

        if(userExist){
            return res.status(400).json({message: "Este email ja existe"})
        }

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
}


// Login do usuario
export const login = async (req, res) => {

    
    try {
        // Buscar user por email
        let userLogin = await prisma.user.findUnique({
            where: {
                email: req.body.email.toLowerCase()
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
        let token = jwt.sign({ id: userLogin.id, email: req.body.email, role: userLogin.role }, process.env.SECRET_KEY, { expiresIn: '1h' })

        res.status(200).json({ message: 'Login realizado com sucesso!', 
            token,
            role: userLogin.role,
            name: userLogin.name,
            id: userLogin.id
        })

        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Erro ao fazer login!' })
    }

    
}



