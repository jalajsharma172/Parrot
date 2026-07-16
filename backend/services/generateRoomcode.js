// Helper to generate a 6-character room code
const Room__Code = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        const _i = Math.floor(Math.random() * chars.length);//
        code += chars.charAt(_i);
    }
    return code;
};
export default Room__Code;

/**
 * Math.random()- between 0 and 1
 * char.length * => Any Index like 5.23 
 * Math.floor()
 *  */