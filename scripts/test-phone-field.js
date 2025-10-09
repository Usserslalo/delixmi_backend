const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  email: 'sofia.lopez@email.com',
  password: 'supersecret'
};

async function testEndpoints() {
  console.log('🧪 Testing Phone Field Implementation...\n');

  try {
    // 1. Test Login Endpoint
    console.log('1️⃣ Testing POST /api/auth/login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (loginResponse.data.status === 'success') {
      console.log('✅ Login successful');
      
      // Verificar campos en la respuesta
      const user = loginResponse.data.data.user;
      console.log('📋 Campos en respuesta de login:');
      console.log(`   - id: ${user.id}`);
      console.log(`   - name: ${user.name}`);
      console.log(`   - lastname: ${user.lastname}`);
      console.log(`   - email: ${user.email}`);
      console.log(`   - phone: ${user.phone || 'NULL'}`);
      console.log(`   - status: ${user.status}`);
      console.log(`   - emailVerifiedAt: ${user.emailVerifiedAt || 'NULL'}`);
      console.log(`   - phoneVerifiedAt: ${user.phoneVerifiedAt || 'NULL'}`);
      console.log(`   - createdAt: ${user.createdAt}`);
      console.log(`   - updatedAt: ${user.updatedAt}`);
      console.log(`   - roles: ${user.roles.length} roles`);

      // Verificar que todos los campos están presentes
      const requiredFields = ['id', 'name', 'lastname', 'email', 'phone', 'status', 'emailVerifiedAt', 'phoneVerifiedAt', 'createdAt', 'updatedAt', 'roles'];
      const missingFields = requiredFields.filter(field => !(field in user));
      
      if (missingFields.length === 0) {
        console.log('✅ Todos los campos requeridos están presentes en login');
      } else {
        console.log(`❌ Campos faltantes en login: ${missingFields.join(', ')}`);
      }

      const token = loginResponse.data.data.token;

      // 2. Test Profile Endpoint
      console.log('\n2️⃣ Testing GET /api/auth/profile...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.data.status === 'success') {
        console.log('✅ Profile fetch successful');
        
        // Verificar campos en la respuesta
        const profileUser = profileResponse.data.data.user;
        console.log('📋 Campos en respuesta de profile:');
        console.log(`   - id: ${profileUser.id}`);
        console.log(`   - name: ${profileUser.name}`);
        console.log(`   - lastname: ${profileUser.lastname}`);
        console.log(`   - email: ${profileUser.email}`);
        console.log(`   - phone: ${profileUser.phone || 'NULL'}`);
        console.log(`   - status: ${profileUser.status}`);
        console.log(`   - emailVerifiedAt: ${profileUser.emailVerifiedAt || 'NULL'}`);
        console.log(`   - phoneVerifiedAt: ${profileUser.phoneVerifiedAt || 'NULL'}`);
        console.log(`   - createdAt: ${profileUser.createdAt}`);
        console.log(`   - updatedAt: ${profileUser.updatedAt}`);
        console.log(`   - roles: ${profileUser.roles.length} roles`);

        // Verificar que todos los campos están presentes
        const profileMissingFields = requiredFields.filter(field => !(field in profileUser));
        
        if (profileMissingFields.length === 0) {
          console.log('✅ Todos los campos requeridos están presentes en profile');
        } else {
          console.log(`❌ Campos faltantes en profile: ${profileMissingFields.join(', ')}`);
        }

        // 3. Test Update Profile Endpoint
        console.log('\n3️⃣ Testing PUT /api/auth/profile...');
        const updateResponse = await axios.put(`${BASE_URL}/auth/profile`, {
          name: 'Sofía María',
          lastname: 'López García',
          phone: '5555555555'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (updateResponse.data.status === 'success') {
          console.log('✅ Profile update successful');
          
          // Verificar campos en la respuesta
          const updatedUser = updateResponse.data.data.user;
          console.log('📋 Campos en respuesta de update:');
          console.log(`   - id: ${updatedUser.id}`);
          console.log(`   - name: ${updatedUser.name}`);
          console.log(`   - lastname: ${updatedUser.lastname}`);
          console.log(`   - email: ${updatedUser.email}`);
          console.log(`   - phone: ${updatedUser.phone || 'NULL'}`);
          console.log(`   - status: ${updatedUser.status}`);
          console.log(`   - emailVerifiedAt: ${updatedUser.emailVerifiedAt || 'NULL'}`);
          console.log(`   - phoneVerifiedAt: ${updatedUser.phoneVerifiedAt || 'NULL'}`);
          console.log(`   - createdAt: ${updatedUser.createdAt}`);
          console.log(`   - updatedAt: ${updatedUser.updatedAt}`);

          // Verificar que todos los campos están presentes
          const updateMissingFields = requiredFields.filter(field => !(field in updatedUser));
          
          if (updateMissingFields.length === 0) {
            console.log('✅ Todos los campos requeridos están presentes en update');
          } else {
            console.log(`❌ Campos faltantes en update: ${updateMissingFields.join(', ')}`);
          }

          // Verificar que los cambios se aplicaron
          if (updatedUser.name === 'Sofía María' && 
              updatedUser.lastname === 'López García' && 
              updatedUser.phone === '5555555555') {
            console.log('✅ Los cambios se aplicaron correctamente');
          } else {
            console.log('❌ Los cambios no se aplicaron correctamente');
          }

        } else {
          console.log('❌ Profile update failed:', updateResponse.data.message);
        }

      } else {
        console.log('❌ Profile fetch failed:', profileResponse.data.message);
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.response?.data || error.message);
  }

  console.log('\n🏁 Testing completed!');
}

// Ejecutar tests
testEndpoints();
