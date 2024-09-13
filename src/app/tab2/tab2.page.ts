import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OnInit } from '@angular/core';
import EscPosEncoder from 'esc-pos-encoder-ionic';
import { BluetoothSerial } from '@awesome-cordova-plugins/bluetooth-serial/ngx';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
    
  private ventaGuardada: any = null; // Propiedad para almacenar la venta

  carrito: any[] = [];
  mercancia: any = {};
  articulos: any = {};
  vendedores: any = {};
  private apiUrlVentas = 'https://information-all-e540a-default-rtdb.firebaseio.com/ventas.json';
  private apiUrlArticulos = 'https://information-all-e540a-default-rtdb.firebaseio.com/articulos.json';
  private apiUrlVendedores = 'https://information-all-e540a-default-rtdb.firebaseio.com/vendedores.json';
  selectedTab: string = 'tab1'; // Tab seleccionado por defecto
  private apiUrl = 'http://localhost:8000/imprimir'; // Cambia esta URL si es necesario
  MAC_ADDRESS = 'DC:0D:51:1C:3B:03'; // check your mac address in listDevices or discoverUnpaired

  constructor(
    private http: HttpClient, 
    private alertController: AlertController, 
    private bluetoothSerial: BluetoothSerial
  ) {
    this.cargarCarrito();
    this.cargarVendedores();
    this.cargarArticulos();
    window.addEventListener('carritoActualizado', () => {
      this.cargarCarrito();
    });
    let encoder = new EscPosEncoder();

    let result = encoder
      .initialize()
      .text('The quick brown fox jumps over the lazy dog')
      .newline()
      .qrcode('https://nielsleenheer.com')
      .encode();

    console.log(result);
  }

  ngOnInit() {
    console.log(this.carrito);

  }

  eliminarDelCarrito(articulo: any) {
    const index = this.carrito.findIndex(item => item.id === articulo.id);
    if (index !== -1) {
      // Eliminar el artículo del carrito
      this.carrito.splice(index, 1);
      this.guardarCarrito();
    }
  }

  agregarAlCarrito(articulo: any) {
    const index = this.carrito.findIndex(item => item.id === articulo.id);
    if (index !== -1) {
      // Si ya está en el carrito, aumentar la cantidad
      this.carrito[index].cantidad++;
    } else {
      // Si no está, añadirlo al carrito
      this.carrito.push({ ...articulo, cantidad: 1 });
    }
    // Disminuir la cantidad en mercancia temporalmente
    this.mercancia[articulo.id].unidades--;
    this.guardarCarrito();
  }

  guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(this.carrito));
  }

  cargarCarrito() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      this.carrito = JSON.parse(carritoGuardado);
    }
  }

  cargarVendedores() {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    if (usuario && usuario.id) {
      this.http.get<any>(this.apiUrlVendedores).subscribe(
        response => {
          this.vendedores = response;
          this.mercancia = this.vendedores[usuario.id]?.mercancia || {};
        },
        error => {
          console.error('Error al cargar los vendedores:', error);
        }
      );
    }
  }

  cargarArticulos() {
    this.http.get<any>(this.apiUrlArticulos).subscribe(
      response => {
        this.articulos = response;
      },
      error => {
        console.error('Error al cargar los artículos:', error);
      }
    );
  }
  actualizarUnidadesEnFirebase() {
    this.carrito.forEach(item => {
      // Obtener el artículo actual en base al id del carrito
      const articuloId = item.id;
  
      // Obtener la cantidad actual del artículo en el nodo de "articulos"
      this.http.get<any>(`https://information-all-e540a-default-rtdb.firebaseio.com/articulos/${articuloId}.json`).subscribe(
        articulo => {
          if (articulo && articulo.cantidad) {
            // Descontar la cantidad en el carrito de la cantidad actual del artículo
            const nuevaCantidad = parseInt(articulo.cantidad, 10) - item.cantidad;
  
            // Actualizar la cantidad en el nodo de "articulos"
            this.http.patch(`https://information-all-e540a-default-rtdb.firebaseio.com/articulos/${articuloId}.json`, { cantidad: nuevaCantidad }).subscribe(
              response => {
                console.log(`Unidades del artículo ${articuloId} actualizadas a ${nuevaCantidad}:`, response);
              },
              error => {
                console.error(`Error al actualizar las unidades del artículo ${articuloId}:`, error);
              }
            );
          }
        },
        error => {
          console.error(`Error al obtener el artículo ${articuloId}:`, error);
        }
      );
    });
  }
  
  guardarCarritoEnDB() {
    const usuarioGuardado = localStorage.getItem('usuarioLogueado');
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

    const venta = {
      carrito: this.carrito,
      fecha: new Date().toISOString(),
      usuario: usuario
    };

    this.http.post(this.apiUrlVentas, venta).subscribe(
      response => {
        // Guardar la venta en la propiedad
        this.ventaGuardada = response;
        console.log('Carrito guardado en la base de datos:', this.ventaGuardada);
        this.demoPrint();

        // Actualizar unidades de mercancía en la base de datos usando PATCH
        const updatedMercancia = { ...this.mercancia };

        this.carrito.forEach(item => {
          if (updatedMercancia[item.id]) {
            updatedMercancia[item.id].unidades -= item.cantidad;
          }
        });

        // Enviar los datos actualizados al servidor usando PATCH
        this.http.patch(`https://information-all-e540a-default-rtdb.firebaseio.com/vendedores/${usuario.id}/mercancia.json`, updatedMercancia).subscribe(
          response => {
            console.log('Unidades de mercancía actualizadas:', response);
          },
          error => {
            console.error('Error al actualizar unidades de mercancía:', error);
          }
        );
        this.actualizarUnidadesEnFirebase();
        // Limpiar el carrito
        this.carrito = [];
        this.guardarCarrito();
      },
      error => {
        console.error('Error al guardar el carrito en la base de datos:', error);
      }
    );
  }

  // Método para acceder a la venta guardada
  obtenerVentaGuardada() {
    return this.ventaGuardada;
  }

  getMercanciaKeys() {
    return Object.keys(this.mercancia);
  }

  calculateTotal(): number {
    let total = 0;

    for (const key of Object.keys(this.mercancia)) {
      const item = this.mercancia[key];
      const quantity = item.unidades || 0;
      const price = this.articulos[key]?.precio || 0;

      total += quantity * price;
    }

    return total;
  }

  demoPrint() {
    const encoder = new EscPosEncoder();
    const result = encoder.initialize();

    let totalGeneral = 0;

    const carritoTexto = this.carrito.map(item => {
      const subtotal = item.cantidad * item.precio;
      totalGeneral += subtotal;
      return `${item.nombre} ${item.cantidad} - $${item.precio} = $${subtotal}`;
    }).join('\n');

    result
      .codepage('windows1250')
      .align('center')
      .line('JASSI')
      .newline()
      .line(carritoTexto)
      .newline()
      .line(`Total: $${totalGeneral}`)
      .newline()
      .newline()
      .newline()
      .align('left')
      .cut();

    const resultByte = result.encode();

    const storedMAC = localStorage.getItem('savedText');
    this.MAC_ADDRESS = storedMAC || ''; // Handle null case

    // send byte code into the printer
    this.bluetoothSerial.connect(this.MAC_ADDRESS).subscribe(() => {
      this.bluetoothSerial.write(resultByte)
        .then(() => {
          this.bluetoothSerial.clear();
          this.bluetoothSerial.disconnect();
          console.log('Print success');
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  reset() {
    console.log('reset')
    window.location.reload();
  }

}
