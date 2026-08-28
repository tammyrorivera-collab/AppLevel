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

function guardarBD() {
    localStorage.setItem('db_usuarios', JSON.stringify(cuadernoVirtual.estudiantes));
    localStorage.setItem('db_listas', JSON.stringify(cuadernoVirtual.materias));
    localStorage.setItem('db_tareas', JSON.stringify(cuadernoVirtual.entregas));
    localStorage.setItem('db_historial', JSON.stringify(cuadernoVirtual.bitacora));
    localStorage.setItem('db_logros', JSON.stringify(cuadernoVirtual.insignias));
}

function mostrarIntro() {
    document.getElementById('pantalla-bienvenida').classList.remove('active');
    document.getElementById('pantalla-intro').classList.add('active');
}

function mostrarLoginRegistro() {
    document.getElementById('pantalla-intro').classList.remove('active');
    document.getElementById('pantalla-login').classList.add('active');
}

function registrarUsuario() {
    const nombreAlumno = document.getElementById('registro-nombre').value;
    const correoMatricula = document.getElementById('registro-usuario').value;
    const claveAcceso = document.getElementById('registro-contrasenna').value;
    const claveConfirmacion = document.getElementById('registro-confirmar').value;

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
    const correoIngresado = document.getElementById('login-usuario').value;
    const claveIngresada = document.getElementById('login-contrasenna').value;
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
    document.getElementById('pantalla-bienvenida').classList.remove('active');
    document.getElementById('pantalla-intro').classList.remove('active');
    document.getElementById('pantalla-login').classList.remove('active');
    
    document.getElementById('app-header').style.display = 'block';
    document.getElementById('app-container').style.display = 'block';
    
    const menuNavegacion = document.getElementById('menu-principal');
    const botonNuevaEntrega = document.getElementById('btn-agregar');
    if (menuNavegacion) menuNavegacion.style.display = 'flex';
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
    if (document.getElementById('usuario-activo')) {
        document.getElementById('usuario-activo').innerText = `${estudianteConectado.nombre} | Nivel ${estudianteConectado.nivel} (${estudianteConectado.xp} XP)`;
    }
}

function agregarXP(puntosExperiencia) {
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

function guardarTarea() {
    const tituloAsignacion = document.getElementById('titulo').value.trim();
    if (!tituloAsignacion) return alert('El título es obligatorio.');

    const nuevaAsignacion = {
        id_tarea: Date.now(),
        id_usuario: estudianteConectado.id_usuario,
        titulo: tituloAsignacion,
        descripcion: document.getElementById('descripcion').value,
        fecha: document.getElementById('fecha').value || new Date().toISOString().split('T')[0],
        hora: document.getElementById('hora').value,
        categoria: document.getElementById('categoria').value,
        prioridad: document.getElementById('prioridad').value,
        estado: 'pendiente'
    };

    cuadernoVirtual.entregas.push(nuevaAsignacion);
    guardarBD();
    renderizarTareas();
    actualizarEstadisticas();
    verificarNotificacionesPendientes();

    document.getElementById('titulo').value = '';
    document.getElementById('descripcion').value = '';
    const ventanaModalElemento = document.getElementById('modalTarea');
    const instanciaModal = bootstrap.Modal.getInstance(ventanaModalElemento) || new bootstrap.Modal(ventanaModalElemento);
    instanciaModal.hide();
}

let estadoFiltroMaterias = 'todas';

function renderizarTareas(filtro = estadoFiltroMaterias) {
    estadoFiltroMaterias = filtro;
    const panelListaDeberes = document.getElementById('lista-tareas');
    const panelInicioDeberes = document.getElementById('proximas-tareas-inicio');

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
            reproducirSonidoNotificacion('notificacion');
        } else {
            deberEncontrado.estado = 'pendiente';
        }

        guardarBD();
        renderizarTareas(estadoFiltroMaterias);
        actualizarRacha();
        verificarNotificacionesPendientes();
    }
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

function cambiarTema() { document.body.classList.toggle('modo-oscuro'); }

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

function descargarMisDatos() {
    if (!estudianteConectado) return alert('Debes iniciar sesión.');

    const expedienteAcademico = {
        perfil: estudianteConectado,
        tareas: cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario),
        listas: cuadernoVirtual.materias.filter(m => m.id_usuario === estudianteConectado.id_usuario)
    };

    const estructuraDatosJSON = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expedienteAcademico, null, 2));
    const enlaceDescargaJSON = document.createElement('a');
    enlaceDescargaJSON.setAttribute("href", estructuraDatosJSON);
    enlaceDescargaJSON.setAttribute("download", `mis_datos_levelstudy_${estudianteConectado.nombre.toLowerCase().replace(/\s+/g, '_')}.json`);
    
    document.body.appendChild(enlaceDescargaJSON);
    enlaceDescargaJSON.click();
    enlaceDescargaJSON.remove();
}

function exportarCSV() {
    if (!estudianteConectado) return alert('Debes iniciar sesión.');

    const tareasDelEstudiante = cuadernoVirtual.entregas.filter(a => a.id_usuario === estudianteConectado.id_usuario);
    if (tareasDelEstudiante.length === 0) return alert('No tienes tareas registradas para exportar.');

    let contenidoPlanillaCSV = "data:text/csv;charset=utf-8,ID,Titulo,Categoria,Prioridad,Estado,Fecha,Hora\n";

    tareasDelEstudiante.forEach(d => {
        const renglonCSV = `"${d.id_tarea}","${d.titulo}","${d.categoria}","${d.prioridad}","${d.estado}","${d.fecha || ''}","${d.hora || ''}"`;
        contenidoPlanillaCSV += renglonCSV + "\n";
    });

    const datosFormateadosURI = encodeURI(contenidoPlanillaCSV);
    const enlaceDescargaCSV = document.createElement("a");
    enlaceDescargaCSV.setAttribute("href", datosFormateadosURI);
    enlaceDescargaCSV.setAttribute("download", `tareas_levelstudy_${estudianteConectado.nombre.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(enlaceDescargaCSV);
    enlaceDescargaCSV.click();
    enlaceDescargaCSV.remove();
}

function reproducirSonidoNotificacion(tipoAlerta = 'notificacion') {
    const interruptorAudio = document.getElementById('notifSonido')?.checked ?? true;
    if (!interruptorAudio) return;

    try {
        const AudioContextEstudio = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextEstudio) return;
        const contextoAudio = new AudioContextEstudio();
        
        const osciladorTono = contextoAudio.createOscillator();
        const controladorGanancia = contextoAudio.createGain();
        osciladorTono.connect(controladorGanancia);
        controladorGanancia.connect(contextoAudio.destination);

        if (tipoAlerta === 'pomodoro') {
            osciladorTono.type = 'triangle';
            osciladorTono.frequency.setValueAtTime(523.25, contextoAudio.currentTime);
            osciladorTono.frequency.setValueAtTime(659.25, contextoAudio.currentTime + 0.15);
            osciladorTono.frequency.setValueAtTime(783.99, contextoAudio.currentTime + 0.30);
            
            controladorGanancia.gain.setValueAtTime(0.4, contextoAudio.currentTime);
            controladorGanancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.6);
            
            osciladorTono.start(contextoAudio.currentTime);
            osciladorTono.stop(contextoAudio.currentTime + 0.6);
        } else {
            osciladorTono.type = 'square';
            osciladorTono.frequency.setValueAtTime(800, contextoAudio.currentTime); 
            osciladorTono.frequency.setValueAtTime(1200, contextoAudio.currentTime + 0.08); 
            
            controladorGanancia.gain.setValueAtTime(0.25, contextoAudio.currentTime);
            controladorGanancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.25);
            
            osciladorTono.start(contextoAudio.currentTime);
            osciladorTono.stop(contextoAudio.currentTime + 0.25);
        }
    } catch (e) {
        console.log(e);
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
            reproducirSonidoNotificacion('pomodoro');
            agregarXP(100);
            alert('¡Tiempo de estudio terminado! Tómate 5 minutos de descanso, toma agua y estírate.');
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

function guardarPreferenciasNotif() {
    const estadoNotifPush = document.getElementById('notifPush')?.checked;
    reproducirSonidoNotificacion('notificacion');

    if (estadoNotifPush && 'Notification' in window) {
        Notification.requestPermission().then(permisoConcedido => {
            if (permisoConcedido === 'granted') {
                alert('Notificaciones y alertas activadas.');
            } else {
                alert('Preferencias guardadas.');
            }
        });
    } else {
        alert('Preferencias guardadas.');
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
