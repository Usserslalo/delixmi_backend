const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/restaurants/7',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      // Guardar respuesta completa
      const fs = require('fs');
      fs.writeFileSync('scripts/restaurant-7-response.json', JSON.stringify(json, null, 2));
      
      console.log('✅ Respuesta guardada en: scripts/restaurant-7-response.json');
      console.log('\n📊 RESUMEN:');
      
      if (json.status === 'success') {
        const restaurant = json.data.restaurant;
        console.log(`  - Restaurante: ${restaurant.name}`);
        console.log(`  - Categorías: ${restaurant.menu.length}`);
        
        let totalProducts = 0;
        restaurant.menu.forEach(category => {
          category.subcategories.forEach(subcategory => {
            totalProducts += subcategory.products.length;
          });
        });
        console.log(`  - Total productos: ${totalProducts}`);
        
        // Analizar productos con y sin modificadores
        let productsWithModifiers = 0;
        let productsWithoutModifiers = 0;
        
        restaurant.menu.forEach(category => {
          category.subcategories.forEach(subcategory => {
            subcategory.products.forEach(product => {
              if (product.modifierGroups && product.modifierGroups.length > 0) {
                productsWithModifiers++;
              } else {
                productsWithoutModifiers++;
                console.log(`  ⚠️  Producto SIN modificadores: ${product.name}`);
              }
            });
          });
        });
        
        console.log(`  - Productos CON modificadores: ${productsWithModifiers}`);
        console.log(`  - Productos SIN modificadores: ${productsWithoutModifiers}`);
        
        // Verificar estructura de un producto
        console.log('\n🔍 EJEMPLO DE PRODUCTO:');
        const firstProduct = restaurant.menu[0].subcategories[0].products[0];
        console.log(JSON.stringify(firstProduct, null, 2));
        
      } else {
        console.log('  ❌ Error:', json.message);
      }
      
    } catch (error) {
      console.error('❌ Error parseando JSON:', error.message);
      console.log('Respuesta cruda:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
});

req.end();

