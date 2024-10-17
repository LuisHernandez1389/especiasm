import { Component, OnInit } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';  // Importa Router para redirigir

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage implements OnInit {
  MAC: string = '';

  saveToLocalStorage() {
    if (this.MAC) {
      localStorage.setItem('savedText', this.MAC);
      alert('MAC guardada');
      this.MAC = ''; // Clear input field after saving
    } else {
      alert('Please enter some text');
    }
  }
  

  public actionSheetButtons = [
    {
      text: 'Cambiar MAC',
      role: 'destructive',
      handler: () => {
        console.log('Opción "Cambiar MAC" seleccionada');
        // Aquí puedes agregar la funcionalidad de cambiar MAC si es necesario
      },
      id: 'open-modal'
    },
    {
      text: 'Cerrar Sesión',
      handler: () => {
        this.logout();  // Llama al método logout
      }
    }
  ];

  presentingElement: any;
  nombre: string | null = null;
  apellido: string | null = null;

  constructor(private router: Router, private actionSheetCtrl: ActionSheetController) {}

  ngOnInit() {
    const usuarioLogueado = localStorage.getItem('usuarioLogueado');
    if (usuarioLogueado) {
      const usuario = JSON.parse(usuarioLogueado);
      this.nombre = usuario.nombre;
      this.apellido = usuario.apellido;
    }
    this.presentingElement = document.querySelector('ion-page');
    console.log(localStorage.getItem('savedText'));
  
  }

async presentActionSheet() {
  const actionSheet = await this.actionSheetCtrl.create({
    header: 'Opciones',
    buttons: this.actionSheetButtons
  });
  
  await actionSheet.present();
  
  const selectedButton = await actionSheet.onDidDismiss();
  if (selectedButton.role === 'destructive') {
    const modal = document.querySelector('ion-modal#open-modal');
    if (modal) {
      (modal as any).present();
    }
  }
}

  logout() {
    localStorage.removeItem('usuarioLogueado');  // Elimina el usuario logueado del localStorage
    this.router.navigate(['/login']);  // Redirige a la página de login
    window.location.reload();
  }
}
