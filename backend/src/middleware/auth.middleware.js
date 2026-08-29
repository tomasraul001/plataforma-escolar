import jwt from "jsonwebtoken"


export const auth = (req, res, next) => {
    const header = req.header('Authorization')

    if (!header || !header.startsWith('Bearer ')) {
        
        return res.status(401).json({ message: 'Acesso negado!' })
    }

    try {
        let token = header.replace('Bearer ', '')
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        req.user = decoded

        next()
        
    } catch (error) {
        res.status(401).json({ message: 'Token inválido!' })
    }
    
}

export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Acesso negado!" });
        }
        next();
    };
};

export const accessLevel = authorize;




