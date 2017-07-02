import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductoService } from '../service/producto.service';
import { Producto } from './../typeScript/producto';
import { FirebaseListObservable, AngularFireDatabase } from 'angularfire2';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaService } from '../service/categoria.service';
import { CompraService } from '../service/compra.service';
import { Compra } from './../typeScript/compra';
import { DetalleCompra } from './../typeScript/detalleCompra';
import { AfiliadoService } from '../service/afiliado.service';
import { Categoria } from './../typeScript/categoria';
import { Afiliado } from '../typeScript/afiliado';
import { ModalComponent } from 'ng2-bs3-modal/ng2-bs3-modal';
import { DatePipe } from "@angular/common";
import { PaginationConfig } from 'ng2-bootstrap';
import * as firebase from 'firebase';

interface Column {
  titulo: string,
  nombre: string,
  sort?: 'desc' | 'asc' | ''
}

@Component({
  selector: 'app-compras',
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.css'],
  providers: [ProductoService, CategoriaService, CompraService, AfiliadoService,
  {provide: PaginationConfig, useValue: { boundaryLinks: true,  firstText: 'First', previousText: '&lsaquo;', nextText: '&rsaquo;', lastText: 'Last', maxSize: 1 }}]
})
export class ComprasComponent implements OnInit {

  @ViewChild('modalEliminarProducto')
  modalEliminarProducto: ModalComponent;

  @ViewChild('modalProductoExistente')
  modalProductoExistente: ModalComponent;

  @ViewChild('modalSaldoInsuficiente')
  modalSaldoInsuficiente: ModalComponent;

  @ViewChild('modalCompraExitosa')
  modalCompraExitosa: ModalComponent;

  @ViewChild('modalVerificarCompra')
  modalVerificarCompra: ModalComponent;

  @ViewChild('modalClienteQR')
  modalClienteQR: ModalComponent;

  @ViewChild('modalConfirmarCompra')
  modalConfirmarCompra: ModalComponent;

  @ViewChild('modalCancelarCompra')
  modalCancelarCompra: ModalComponent;

  producto: Producto = new Producto();
  productos: FirebaseListObservable<Producto[]>;
  categorias: FirebaseListObservable<Categoria[]>;
  categoria: Categoria = new Categoria();
  compra: Compra = new Compra();
  afiliados: FirebaseListObservable<Afiliado[]>;
  afiliado: Afiliado = new Afiliado();
  detalleCompra: DetalleCompra = new DetalleCompra();
  date: DatePipe = new DatePipe("en-US");

  private idPro;
  private sub: any;
  private listaProductosDetalle = [];
  private datosProductos: string;
  private datosCargados: boolean;

  // atributos de la tabla
  public rows: Array<any> = [];
  public columns: Array<any> = [
    {titulo: 'Categoría', nombre: 'categoria'},
    {titulo: 'Producto', nombre: 'producto'},
    {titulo: 'Precio', nombre: 'precio'}
  ];
  private data: Array<any> = [];

  // atributos de la paginacion
  public page: number = 1;
  public itemsPerPage: number = 10;
  public maxSize: number = 5;
  public numPages: number = 1;
  public length: number = 0;

  public config: any = {
    paging: true,
    sorting: {columns: this.columns},
    filtering: {filterString: ''},
    className: ['table table-hovered']
  };

  constructor(private productoServicio: ProductoService, private route: ActivatedRoute,
    private categoriaServicio: CategoriaService, private afiliadoService: AfiliadoService,
    private compraServicio: CompraService, private db: AngularFireDatabase, private router: Router) { 
    this.length = this.data.length;
    this.datosCargados = true;

    this.categorias = this.categoriaServicio.getCategorias(this.idPro);

    this.categorias.subscribe(data => {
        this.datosCargados = false;
    });
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
       this.idPro = params['id'];
    });
    this.getAfiliados();
    this.obtenerListaCategoriaProducto();
    this.afiliado.saldo = 0;
    this.categoria.nombre = "";
    this.afiliado.nombre = "";
    this.onChangeTable(this.config);
  }

  buscarAfiliado() {
    const queryObservable = this.db.list('/proveedor/' + this.idPro + '/afiliados', {
      query: {
        orderByChild: 'key',
        equalTo: this.afiliado.key
      }
    }).first();

    queryObservable.subscribe(queriedItems => {
      if(queriedItems.length > 0) {
        this.afiliado.nombre = queriedItems[0].nombre;
      }
    }); 
  }

  obtenerListaCategoriaProducto() {
    const categoriaObservable = this.db.list('/proveedor/' + this.idPro + '/categoria', {
      query: {
        orderByChild: 'nombre'
      }
    }).first();

    categoriaObservable.subscribe(categoriaItems => {
      if(categoriaItems.length > 0) {
        for (var i = 0; i < categoriaItems.length; i++) {
          var keyProductos: Array<any> = categoriaItems[i].producto;
          for (var keyPro in keyProductos) {
            this.data.push({ keyCat: categoriaItems[i].$key, categoria: categoriaItems[i].nombre,
             keyPro: keyPro, producto: keyProductos[keyPro].nombre, precio: keyProductos[keyPro].precio });
            this.onChangeTable(this.config);
          }
        }
      } 
    }); 
  }

  getAfiliados(): void {
    this.afiliados = this.afiliadoService.getAfiliados(this.idPro);
  }

  obtenerIdCliente(key: string) {
    this.afiliado.key = key;
    if (key == '') {
      this.afiliado.saldo = 0;
    } else {
      this.obtenerSaldoAfiliado(this.afiliado.key);
    }    
  }

  obtenerSaldoAfiliado(key) {
    const queryObservable = this.db.list('/proveedor/' + this.idPro + '/afiliados', {
      query: {
        orderByChild: 'key',
        equalTo: key
      }
    }).first();

    queryObservable.subscribe(queriedItems => {
      if (queriedItems.length > 0) {
        this.afiliado.saldo = queriedItems[0].saldo;
      }
    });
  }

  calcularTotal() {
    var total = 0;
    for (var i = 0; i < this.listaProductosDetalle.length; i++) {
      total += (parseFloat(this.listaProductosDetalle[i].precio) * this.listaProductosDetalle[i].cantidad);
      this.compra.total = total;
    }
    return this.compra.total;
  }

  actualizarVecesCompradas(cantidad: number, idProducto: string, idCategoria: string) {
    const queryObservable = this.db.list('/proveedor/' + this.idPro + '/categoria/' + idCategoria + '/producto', {
      query: {
        orderByChild: 'nombre'
      }
    }).first();

    queryObservable.subscribe(queriedItems => {
      if (queriedItems.length > 0) {
        for (var i = 0; i < queriedItems.length; i++) {
          if (queriedItems[i].$key == idProducto) {
            var veces = queriedItems[i].veces + cantidad;
            this.productoServicio.actualizarVecesCompradas(this.idPro, idCategoria, idProducto, veces);
          }
        }        
      }
    });
  }

  realizarCompra() {
    if (this.listaProductosDetalle.length == 0 || this.afiliado.nombre == "" || this.afiliado.saldo == 0) {
      this.modalVerificarCompra.open();
    } else {
      const queryObservable = this.db.list('/proveedor/' + this.idPro + '/afiliados', {
        query: {
          orderByChild: 'key',
          equalTo: this.afiliado.key
        }
      }).first();

      queryObservable.subscribe(queriedItems => {
        if (queriedItems.length > 0) {
          if (this.compra.total > queriedItems[0].saldo) {
            this.modalSaldoInsuficiente.open();
          } else {
            this.guardarCompra();
            var saldoTotal = queriedItems[0].saldo - this.compra.total;
            this.afiliadoService.actualizarSaldo(this.idPro, saldoTotal, this.afiliado.key);
            for (var i = 0; i < this.listaProductosDetalle.length; i++) {
              this.actualizarVecesCompradas(this.listaProductosDetalle[i].cantidad, 
                this.listaProductosDetalle[i].keyPro, this.listaProductosDetalle[i].keyCat);
            }
          }  
        }
      });
    }
  }

  redireccionarDetalleCompra(ultimoKeyAgregado: string) {
    this.router.navigateByUrl('/proveedor/' + this.idPro + '/afiliado/' + this.afiliado.key + 
      '/compra/' + ultimoKeyAgregado + '/detalle');
  }

  agregarCompra(idProveedor, idAfiliado, detalle: Array<DetalleCompra>, nuevaCompra: Compra) {
    nuevaCompra.detalleCompra = detalle;
    var ultimoKeyAgregado = firebase.database().ref('/proveedor/' + idProveedor + '/afiliados/' 
      + idAfiliado + '/compras').push(nuevaCompra).key;
    this.redireccionarDetalleCompra(ultimoKeyAgregado);
  }

  guardarCompra() {
    this.compra.fecha_Compra =  this.date.transform(new Date(), 'dd/MM/yyyy');
    this.agregarCompra(this.idPro, this.afiliado.key, this.listaProductosDetalle, this.compra);
    this.modalCompraExitosa.open();
  }

  agregarProductoDetalle(keyCat: string, categoria: string, keyPro: string, produ: string, precio: number) {
    var indice = this.listaProductosDetalle.map(lista => lista.keyPro).indexOf(keyPro);
    if (indice >= 0) {
      this.modalProductoExistente.open();
    } else {
      var producto = { keyPro: keyPro, keyCat: keyCat, categoria: categoria, producto: produ, 
        precio: precio, cantidad: 1 };
      this.listaProductosDetalle.push(producto);
      this.calcularTotal();
    }
  }

  abrirModalEliminarDetalle(key: string, nombre: string, precio: number, cantidad: number) {
    this.producto.key = key;
    this.producto.nombre = nombre;
    this.producto.precio = precio;
    this.detalleCompra.cantidad = cantidad;
    this.modalEliminarProducto.open();
  }

  eliminarProductoDetalle() {
    var indice = this.listaProductosDetalle.map(lista => lista.keyPro).indexOf(this.producto.key);
    if (indice > -1) {
      this.listaProductosDetalle.splice(indice, 1);
    }
    this.calcularTotal();
    if (this.listaProductosDetalle.length == 0) {
      this.compra.total = 0;
    }
  }

  actualizarProductoDetalle(cantidad: number) {
    var indice = this.listaProductosDetalle.map(lista => lista.keyPro).indexOf(this.producto.key);
    if (indice > -1) {
      this.listaProductosDetalle.splice(indice, 1, { cantidad: cantidad });
    }
    this.calcularTotal();
  }

  leerCodigoQRCliente(codigoQR: string) {
    this.obtenerIdCliente(codigoQR);
    this.buscarAfiliado();
    if (codigoQR !== "") {
      this.modalClienteQR.close();
    }
  }

  abirConfirmarCompra() {
    this.modalConfirmarCompra.open();
  }

  public changePage(page: any, data: Array<any> = this.data): Array<any> {
    let start = (page.page - 1) * page.itemsPerPage;
    let end = page.itemsPerPage > -1
      ? (start + page.itemsPerPage)
      : data.length;
    return data.slice(start, end);
  }

  public changeSort(data: any, config: any): any {
    if (!config.sorting) {
      return data;
    }

    let columns = this.config.sorting.columns || [];
    let columnName: string = void 0;
    let sort: string = void 0;

    for (let i = 0; i < columns.length; i++) {
      if (columns[i].sort !== '' && columns[i].sort !== false) {
        columnName = columns[i].nombre;
        sort = columns[i].sort;
      }
    }

    if (!columnName) {
      return data;
    }

    // simple sorting
    return data.sort((previous: any, current: any) => {
      if (previous[columnName] > current[columnName]) {
        return sort === 'desc'
          ? -1
          : 1;
      } else if (previous[columnName] < current[columnName]) {
        return sort === 'asc'
          ? -1
          : 1;
      }
      return 0;
    });
  }

  public changeFilter(data: any, config: any): any {
    let filteredData: Array<any> = data;
    this.columns.forEach((column: any) => {
      if (column.filtering) {
        filteredData = filteredData.filter((item: any) => {
          return item[column.nombre].match(column.filtering.filterString);
        });
      }
    });

    if (!config.filtering) {
      return filteredData;
    }

    if (config.filtering.columnName) {
      return filteredData.filter((item: any) =>
        item[config.filtering.columnName].match(this.config.filtering.filterString));
    }

    let tempArray: Array<any> = [];
    filteredData.forEach((item: any) => {
      let flag = false;
      this.columns.forEach((column: any) => {
        if (item[column.nombre].toString()
                             .match(this.config.filtering.filterString)) {
          flag = true;
        }
      });
      if (flag) {
        tempArray.push(item);
      }
    });
    filteredData = tempArray;

    return filteredData;
  }

  public onChangeTable(config: any, pageNumber?: number): any {
    const page : {itemsPerPage: number, page: number} = {
      itemsPerPage: this.itemsPerPage,
      page: pageNumber ? pageNumber : 1
    };
    if (config.filtering) {
      Object.assign(this.config.filtering, config.filtering);
    }

    if (config.sorting) {
      Object.assign(this.config.sorting, config.sorting);
    }

    let filteredData = this.changeFilter(this.data, this.config);
    let sortedData = this.changeSort(filteredData, this.config);
    this.rows = page && config.paging
      ? this.changePage(page, sortedData)
      : sortedData;
    this.length = sortedData.length;
  }

  public getData(row: any, column: Column): string {
    if (!row) {
      return ''
    }
    if (column.nombre == 'precio') {
      return '$' + row[column.nombre];
    } else {
      return row[column.nombre];
    } 
  }

  public sortByColumn(columnToSort: Column) {
    const sorting: Array<Column> = Object.assign({}, this.config.sorting).columns;

    const sorted = sorting.map((column: Column) => {
      if (columnToSort.nombre === column.nombre) {
        const newSort = column.sort === 'asc'
          ? 'desc'
          : 'asc';
        return Object.assign(column, {sort: newSort});
      } else {
        return Object.assign(column, {sort: ''});
      }
    });

    const config = Object.assign({}, this.config, {
      sorting: {columns: sorted}
    });
    this.onChangeTable(config);
  }

}
