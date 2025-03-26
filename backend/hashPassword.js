const bcrypt = require('bcryptjs');

async function hashPassword() {
    const plainPassword = "hashedpassword123"; // The correct password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    console.log(`UPDATE Users SET password = '${hashedPassword}' WHERE email = 'sonyalpha08@gmail.com';`);
}

hashPassword();
