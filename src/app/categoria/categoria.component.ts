import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Categoria } from './../typeScript/categoria';
import { CategoriaService } from '../service/categoria.service';
import { AngularFire, FirebaseListObservable} from 'angularfire2';
import { ModalComponent } from 'ng2-bs3-modal/ng2-bs3-modal';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-categoria',
  templateUrl: './categoria.component.html',
  styleUrls: ['./categoria.component.css'],
  providers: [CategoriaService]
})
export class CategoriaComponent implements OnInit, OnDestroy {

  // Variables de la interfaz
  titulo = 'Registro de categorías del proveedor';

  @ViewChild('modalCategoriaEliminar')
  modalEliminar: ModalComponent;

  @ViewChild('modalCategoriaModificar')
  modalModificar: ModalComponent;

  @ViewChild('modalCategoriaCrear')
  modalCrear: ModalComponent;

  // Variables para gestionar categorias
  key;
  private id;
  private sub: any;
  categoria: Categoria = new Categoria();
  categorias: FirebaseListObservable<Categoria[]>;

  datosCargados: boolean;

  constructor(private categoriaServicio: CategoriaService, private route: ActivatedRoute, public af: AngularFire) {
    this.datosCargados = true;

    this.categorias = this.categoriaServicio.getCategorias(this.id);

    this.categorias.subscribe(data => {
        this.datosCargados = false;
    });
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
       this.id = params['id'];
    });
    this.getCategorias();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  getCategorias(): void {
    this.categorias = this.categoriaServicio.getCategorias(this.id);
  }

  agregarCategoria() {
    this.categoriaServicio.agregarCategoria(this.id, this.categoria);
  }

  eliminarCategoria() {
    this.categoriaServicio.eliminarCategoria(this.id, this.key);
    this.categoria = new Categoria();
  }

  actualizarCategoria() {
    this.categoriaServicio.actualizarCategoria(this.id, this.key, this.categoria);
  }

  openModalCategoriaCrear() {
    this.modalCrear.open();
    this.categoria = new Categoria();
  }

  openModalCategoriaEliminar(id: string, descripcion: string, nombre: string) {
    this.key = id;
    this.categoria.descripcion = descripcion;
    this.categoria.nombre = nombre;
    this.modalEliminar.open();
  }

  openModalCategoriaEditar(id: string, descripcion: string, nombre: string) {
    this.key = id;
    this.categoria.descripcion = descripcion;
    this.categoria.nombre = nombre;
    this.modalModificar.open();
  }
}
