let cuadernoVirtual = {
    estudiantes: JSON.parse(localStorage.getItem('db_usuarios')) || [],
    materias: JSON.parse(localStorage.getItem('db_listas')) || [],
    entregas: JSON.parse(localStorage.getItem('db_tareas')) || [],
    bitacora: JSON.parse(localStorage.getItem('db_historial')) || [],
    insignias: JSON.parse(localStorage.getItem('db_logros')) || []
};

let estudianteConectado = JSON.parse(localStorage.getItem('usuarioActivo')) || null;
let relojPomodoro = null;
let minutosEstudioRestantes = 25 * 60;
let estadoFiltroMaterias = 'todas';

function guardarBD() {
    localStorage.setItem('db_usuarios', JSON.stringify(cuadernoVirtual.estudiantes));
    localStorage.setItem('db_listas', JSON.stringify(cuadernoVirtual.materias));
    localStorage.setItem('db_tareas', JSON.stringify(cuadernoVirtual.entregas));
    localStorage.setItem('db_historial', JSON.stringify(cuadernoVirtual.bitacora));
    localStorage.setItem('db_logros', JSON.stringify(cuadernoVirtual.insignias));
}

function mostrarIntro() {
    const bienvenida = document.getElementById('pantalla-bienvenida');
    const intro = document.getElementById('pantalla-intro');
    if (bienvenida) bienvenida.classList.remove('active');
    if (intro) intro.classList.add('active');
}

function mostrarLoginRegistro() {
    const intro = document.getElementById('pantalla-intro');
    const login = document.getElementById('pantalla-login');
    if (intro) intro.classList.remove('active');
    if (login) login.classList.add('active');
}

function registrarUsuario() {
    const nombreInput = document.getElementById('registro-nombre');
    const usuarioInput = document.getElementById('registro-usuario');
    const passInput = document.getElementById('registro-contrasenna');
    const confirmInput = document.getElementById('registro-confirmar');

    if (!nombreInput || !usuarioInput || !passInput) return;

    const nombreAlumno = nombreInput.value.trim();
    const correoMatricula = usuarioInput.value.trim();
    const claveAcceso = passInput.value;
    const claveConfirmacion = confirmInput ? confirmInput.value : '';

    if (!nombreAlumno || !correoMatricula || !claveAcceso) return alert('Por favor completa todos los campos.');
    if (claveAcceso !== claveConfirmacion) return alert('Las contraseñas no coinciden.');
    if (cuadernoVirtual.estudiantes.find(e => e.email === correoMatricula)) return alert('El usuario ya existe.');

    const nuevoEstudiante = { 
        id_usuario: Date.now(), 
        nombre: nombreAlumno, 
        email: correoMatricula, 
        contraseña: claveAcceso, 
        fecha_creacion: new Date().toISOString(), 
        estado: true,
        xp: 0,
        nivel: 1
    };

    cuadernoVirtual.estudiantes.push(nuevoEstudiante);
    cuadernoVirtual.materias.push({ id_lista: Date.now() + 1, id_usuario: nuevoEstudiante.id_usuario, nombre: "General" });
    
    guardarBD();
    estudianteConectado = nuevoEstudiante;
    localStorage.setItem('usuarioActivo', JSON.stringify(estudianteConectado));
    cargarApp();
}

function iniciarSesion() {
    const usuarioInput = document.getElementById('login-usuario');
    const passInput = document.getElementById('login-contrasenna');

    if (!usuarioInput || !passInput) return;

    const correoIngresado = usuarioInput.value.trim();
    const claveIngresada = passInput.value;
    const alumnoEncontrado = cuadernoVirtual.estudiantes.find(e => e.email === correoIngresado && e.contraseña === claveIngresada);

    if (alumnoEncontrado) {
        if (!alumnoEncontrado.xp) alumnoEncontrado.xp = 0;
        if (!alumnoEncontrado.nivel) alumnoEncontrado.nivel = 1;
        estudianteConectado = alumnoEncontrado;
        localStorage.setItem('usuarioActivo', JSON.stringify(estudianteConectado));
        cargarApp();
    } else {
        alert('Usuario o contraseña incorrectos.');
    }
}

function cargarApp() {
    ['pantalla-bienvenida', 'pantalla-intro', 'pantalla-login'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    
    const appHeader = document.getElementById('app-header');
    const appContainer = document.getElementById('app-container');
    if (appHeader) appHeader.style.display = 'block';
    if (appContainer) appContainer.style.display = 'block';
    
    const menuNavegacion = document.getElementById('menu-principal');
    const botonNuevaEntrega = document.getElementById('btn-agregar');
    if (menuNavegacion) menuNavegacion.style.display = 'block';
    if (botonNuevaEntrega) botonNuevaEntrega.style.display = 'flex';
    
    actualizarEncabezadoUsuario();
    if (document.getElementById('perfil-nombre')) document.getElementById('perfil-nombre').innerText = estudianteConectado.nombre;
    if (document.getElementById('perfil-usuario')) document.getElementById('perfil-usuario').innerText = estudianteConectado.email;
    
    renderizarTareas();
    actualizarEstadisticas();
    actualizarRacha();
    verificarNotificacionesPendientes();
    cambiarPantallaApp('inicio');
}

function actualizarEncabezadoUsuario() {
    if (document.getElementById('usuario-activo') && estudianteConectado) {
        document.getElementById('usuario-activo').innerText = `${estudianteConectado.nombre} | Nivel ${estudianteConectado.nivel} (${estudianteConectado.xp} XP)`;
    }
}

function cambiarPantallaApp(seccionAcademica) {
    const vistasApp = document.querySelectorAll('.pantalla');
    vistasApp.forEach(v => v.classList.remove('active'));
    
    const seccionObjetivo = document.getElementById('pantalla-' + seccionAcademica);
    if (seccionObjetivo) {
        seccionObjetivo.classList.add('active');
    }

    const iconosNavegacion = document.querySelectorAll('.nav-icon');
    iconosNavegacion.forEach(icono => icono.classList.remove('active'));
    const iconoSeleccionado = document.querySelector(`.nav-icon[onclick*="${seccionAcademica}"]`);
    if (iconoSeleccionado) {
        iconoSeleccionado.classList.add('active');
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuarioActivo');
    location.reload();
}

function abrirNotificaciones() { 
    verificarNotificacionesPendientes();
    cambiarPantallaApp('notificaciones'); 
}
function abrirPrivacidad() { cambiarPantallaApp('privacidad'); }
function volverAPerfil() { cambiarPantallaApp('perfil'); }
function volverATareas() { cambiarPantallaApp('tareas'); }

function guardarTarea() {
    const tituloInput = document.getElementById('titulo');
    if (!tituloInput) return;

    const tituloAsignacion = tituloInput.value.trim();
    if (!tituloAsignacion) return alert('El título es obligatorio.');

    const nuevaAsignacion = {
        id_tarea: Date.now(),
        id_usuario: estudianteConectado.id_usuario,
        titulo: tituloAsignacion,
        descripcion: document.getElementById('descripcion')?.value || '',
        fecha: document.getElementById('fecha')?.value || new Date().toISOString().split('T')[0],
        hora: document.getElementById('hora')?.value || '',
        categoria: document.getElementById('categoria')?.value || 'General',
        prioridad: document.getElementById('prioridad')?.value || 'media',
        estado: 'pendiente'
    };

    cuadernoVirtual.entregas.push(nuevaAsignacion);
    guardarBD();
    renderizarTareas();
    actualizarEstadisticas();
    verificarNotificacionesPendientes();

    tituloInput.value = '';
    if (document.getElementById('descripcion')) document.getElementById('descripcion').value = '';
    
    const ventanaModalElemento = document.getElementById('modalTarea');
    if (ventanaModalElemento && typeof bootstrap !== 'undefined') {
        const instanciaModal = bootstrap.Modal.getInstance(ventanaModalElemento) || new bootstrap.Modal(ventanaModalElemento);
        instanciaModal.hide();
    }
}

function renderizarTareas(filtro = estadoFiltroMaterias) {
    estadoFiltroMaterias = filtro;
    const panelListaDeberes = document.getElementById('lista-tareas');
    const panelInicioDeberes = document.getElementById('proximas-tareas-inicio');

    if (!estudianteConectado) return;

    const asignacionesAlumno = cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario);
    let deberesFiltrados = asignacionesAlumno;

    if (filtro === 'pendientes') deberesFiltrados = asignacionesAlumno.filter(a => a.estado === 'pendiente');
    if (filtro === 'completadas') deberesFiltrados = asignacionesAlumno.filter(a => a.estado === 'completada');

    if (panelListaDeberes) {
        let plantillaHTML = '';
        deberesFiltrados.forEach(d => {
            const entregaFinalizada = d.estado === 'completada';
            plantillaHTML += `
                <div class="card p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
                    <div>
                        <h5 class="${entregaFinalizada ? 'text-decoration-line-through text-muted' : ''} mb-1">${d.titulo}</h5>
                        <small class="text-muted">${d.categoria} | Prioridad: ${d.prioridad}</small>
                    </div>
                    <button class="btn btn-sm ${entregaFinalizada ? 'btn-secondary' : 'btn-success'}" onclick="completarTarea(${d.id_tarea})">
                        <i class="bi ${entregaFinalizada ? 'bi-arrow-counterclockwise' : 'bi-check-lg'}"></i>
                    </button>
                </div>
            `;
        });
        panelListaDeberes.innerHTML = plantillaHTML || '<p class="text-white">No hay tareas en esta sección.</p>';
    }

    if (panelInicioDeberes) {
        const entregasPendientesInicio = asignacionesAlumno.filter(a => a.estado === 'pendiente');
        let plantillaInicio = '';
        entregasPendientesInicio.forEach(d => {
            plantillaInicio += `
                <div class="card p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${d.titulo}</h5>
                        <small class="text-muted">${d.categoria} | Prioridad: ${d.prioridad}</small>
                    </div>
                    <button class="btn btn-sm btn-success" onclick="completarTarea(${d.id_tarea})">
                        <i class="bi bi-check-lg"></i>
                    </button>
                </div>
            `;
        });
        panelInicioDeberes.innerHTML = plantillaInicio || '<p class="text-white">Sin tareas pendientes.</p>';
    }

    actualizarEstadisticas();
}

function filtrarTareas(criterioMateria) {
    estadoFiltroMaterias = criterioMateria;
    renderizarTareas(criterioMateria);
}

function completarTarea(idDeber) {
    const deberEncontrado = cuadernoVirtual.entregas.find(d => d.id_tarea === idDeber);
    if (deberEncontrado) {
        if (deberEncontrado.estado === 'pendiente') {
            deberEncontrado.estado = 'completada';
            deberEncontrado.fecha = new Date().toISOString().split('T')[0];
            agregarXP(50);
        } else {
            deberEncontrado.estado = 'pendiente';
        }

        guardarBD();
        renderizarTareas(estadoFiltroMaterias);
        actualizarRacha();
        verificarNotificacionesPendientes();
    }
}

function agregarXP(puntosExperiencia) {
    if (!estudianteConectado) return;
    estudianteConectado.xp += puntosExperiencia;
    const gradoAlcanzado = Math.floor(estudianteConectado.xp / 200) + 1;
    
    if (gradoAlcanzado > estudianteConectado.nivel) {
        estudianteConectado.nivel = gradoAlcanzado;
        alert(`¡Felicidades! Has alcanzado el Nivel ${gradoAlcanzado}`);
    }
    
    const indiceAlumno = cuadernoVirtual.estudiantes.findIndex(e => e.id_usuario === estudianteConectado.id_usuario);
    if (indiceAlumno !== -1) cuadernoVirtual.estudiantes[indiceAlumno] = estudianteConectado;

    localStorage.setItem('usuarioActivo', JSON.stringify(estudianteConectado));
    guardarBD();
    actualizarEncabezadoUsuario();
}

function actualizarRacha() {
    if (!estudianteConectado) return;

    const asignacionesRealizadas = cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario && a.estado === 'completada');

    if (asignacionesRealizadas.length === 0) {
        mostrarTextoRacha(0);
        return;
    }

    const registroFechas = asignacionesRealizadas
        .map(a => a.fecha)
        .filter(f => f)
        .sort()
        .reverse();

    const fechasSinDuplicados = [...new Set(registroFechas)];

    let evaluadorFecha = new Date();
    let diasDeConstancia = 0;

    for (let i = 0; i < 30; i++) {
        const cadenaFecha = evaluadorFecha.toISOString().split('T')[0];
        if (fechasSinDuplicados.includes(cadenaFecha)) {
            diasDeConstancia++;
            evaluadorFecha.setDate(evaluadorFecha.getDate() - 1);
        } else if (i === 0) {
            evaluadorFecha.setDate(evaluadorFecha.getDate() - 1);
        } else {
            break;
        }
    }

    const rachaFinalEstudio = Math.max(diasDeConstancia, asignacionesRealizadas.length > 0 ? 1 : 0);
    mostrarTextoRacha(rachaFinalEstudio);
}

function mostrarTextoRacha(diasEstudiados) {
    const contadorDiasUI = document.getElementById('racha-dias');
    const mensajeMotivacionalUI = document.getElementById('racha-mensaje');

    if (contadorDiasUI) contadorDiasUI.innerText = diasEstudiados;
    if (mensajeMotivacionalUI) {
        if (diasEstudiados === 0) {
            mensajeMotivacionalUI.innerText = "¡Completa una tarea hoy para empezar!";
        } else if (diasEstudiados === 1) {
            mensajeMotivacionalUI.innerText = "¡Buen inicio! Vuelve mañana para mantenerla.";
        } else {
            mensajeMotivacionalUI.innerText = `¡Increíble! ${diasEstudiados} días seguidos. ¡Sigue así!`;
        }
    }
}

function cambiarTema() { 
    document.body.classList.toggle('modo-oscuro'); 
}

function toggleProgresoPerfil() {
    const interruptorRendimiento = document.getElementById('privProgreso');
    const contenedorEstadisticasPerfil = document.getElementById('resumen-progreso-perfil');
    
    if (interruptorRendimiento && contenedorEstadisticasPerfil) {
        if (interruptorRendimiento.checked) {
            contenedorEstadisticasPerfil.style.display = 'block';
            const totalDeberesHechos = cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario && a.estado === 'completada').length;
            const campoCompletadasUI = document.getElementById('perfil-completadas-num');
            const campoNivelUI = document.getElementById('perfil-nivel');
            
            if (campoCompletadasUI) campoCompletadasUI.innerText = totalDeberesHechos;
            if (campoNivelUI) campoNivelUI.innerText = `Nivel ${estudianteConectado.nivel} (${estudianteConectado.xp} XP)`;
        } else {
            contenedorEstadisticasPerfil.style.display = 'none';
        }
    }
}

function actualizarEstadisticas() {
    if (!estudianteConectado) return;
    const asignacionesAlumno = cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario);
    const conteoFinalizadas = asignacionesAlumno.filter(a => a.estado === 'completada').length;
    const conteoPorEntregar = asignacionesAlumno.filter(a => a.estado === 'pendiente').length;

    if (document.getElementById('total-completadas')) document.getElementById('total-completadas').innerText = conteoFinalizadas;
    if (document.getElementById('total-pendientes')) document.getElementById('total-pendientes').innerText = conteoPorEntregar;
}

function iniciarTemp() {
    if (relojPomodoro) return;
    relojPomodoro = setInterval(() => {
        if (minutosEstudioRestantes > 0) {
            minutosEstudioRestantes--;
            actualizarReloj();
        } else {
            clearInterval(relojPomodoro);
            relojPomodoro = null;
            agregarXP(100);
            alert('¡Tiempo de estudio terminado! Tómate 5 minutos de descanso.');
        }
    }, 1000);
}

function pausarTemp() {
    clearInterval(relojPomodoro);
    relojPomodoro = null;
}

function reiniciarTemp() {
    pausarTemp();
    minutosEstudioRestantes = 25 * 60;
    actualizarReloj();
}

function actualizarReloj() {
    const minutosFormato = Math.floor(minutosEstudioRestantes / 60).toString().padStart(2, '0');
    const segundosFormato = (minutosEstudioRestantes % 60).toString().padStart(2, '0');
    if (document.getElementById('temporizador')) {
        document.getElementById('temporizador').innerText = `${minutosFormato}:${segundosFormato}`;
    }
}

function verificarNotificacionesPendientes() {
    if (!estudianteConectado) return;
    
    const fechaActualCadena = new Date().toISOString().split('T')[0];
    const entregasVencenHoy = cuadernoVirtual.entregas.filter(a => 
        a.id_usuario === estudianteConectado.id_usuario && 
        a.estado === 'pendiente' && 
        a.fecha === fechaActualCadena
    );

    const contenedorAvisosUI = document.getElementById('lista-notificaciones');
    if (contenedorAvisosUI) {
        if (entregasVencenHoy.length > 0) {
            let estructuraAlertas = '';
            entregasVencenHoy.forEach(d => {
                estructuraAlertas += `
                    <div class="alert alert-warning d-flex align-items-center mb-2" role="alert">
                        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                        <div>
                            <strong>¡Atención!</strong> La tarea <strong>"${d.titulo}"</strong> vence hoy.
                        </div>
                    </div>
                `;
            });
            contenedorAvisosUI.innerHTML = estructuraAlertas;
        } else {
            contenedorAvisosUI.innerHTML = '<p class="text-muted small mb-0">No tienes tareas por vencer hoy.</p>';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const menuNavegacion = document.getElementById('menu-principal');
    const botonNuevaEntrega = document.getElementById('btn-agregar');
    const encabezadoApp = document.getElementById('app-header');
    const contenedorPrincipalApp = document.getElementById('app-container');

    if (estudianteConectado) {
        cargarApp();
    } else {
        if (menuNavegacion) menuNavegacion.style.display = 'none';
        if (botonNuevaEntrega) botonNuevaEntrega.style.display = 'none';
        if (encabezadoApp) encabezadoApp.style.display = 'none';
        if (contenedorPrincipalApp) contenedorPrincipalApp.style.display = 'none';
    }
});
