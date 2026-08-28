let db = {
    usuarios: JSON.parse(localStorage.getItem('db_usuarios')) || [],
    listas_tareas: JSON.parse(localStorage.getItem('db_listas')) || [],
    tareas: JSON.parse(localStorage.getItem('db_tareas')) || [],
    historial: JSON.parse(localStorage.getItem('db_historial')) || [],
    logros: JSON.parse(localStorage.getItem('db_logros')) || []
};

let usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo')) || null;
let temporizadorInterval = null;
let tiempoRestante = 25 * 60;

function guardarBD() {
    localStorage.setItem('db_usuarios', JSON.stringify(db.usuarios));
    localStorage.setItem('db_listas', JSON.stringify(db.listas_tareas));
    localStorage.setItem('db_tareas', JSON.stringify(db.tareas));
    localStorage.setItem('db_historial', JSON.stringify(db.historial));
    localStorage.setItem('db_logros', JSON.stringify(db.logros));
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
    const nombre = document.getElementById('registro-nombre').value;
    const email = document.getElementById('registro-usuario').value;
    const contraseña = document.getElementById('registro-contrasenna').value;
    const confirmar = document.getElementById('registro-confirmar').value;

    if (!nombre || !email || !contraseña) return alert('Por favor completa todos los campos.');
    if (contraseña !== confirmar) return alert('Las contraseñas no coinciden.');
    if (db.usuarios.find(u => u.email === email)) return alert('El usuario ya existe.');

    const nuevoUsuario = { 
        id_usuario: Date.now(), 
        nombre, 
        email, 
        contraseña, 
        fecha_creacion: new Date().toISOString(), 
        estado: true,
        xp: 0,
        nivel: 1
    };

    db.usuarios.push(nuevoUsuario);
    db.listas_tareas.push({ id_lista: Date.now() + 1, id_usuario: nuevoUsuario.id_usuario, nombre: "General" });
    
    guardarBD();
    usuarioActivo = nuevoUsuario;
    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
    cargarApp();
}

function iniciarSesion() {
    const email = document.getElementById('login-usuario').value;
    const contraseña = document.getElementById('login-contrasenna').value;
    const usuario = db.usuarios.find(u => u.email === email && u.contraseña === contraseña);

    if (usuario) {
        if (!usuario.xp) usuario.xp = 0;
        if (!usuario.nivel) usuario.nivel = 1;
        usuarioActivo = usuario;
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
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
    
    const menu = document.getElementById('menu-principal');
    const btnAgregar = document.getElementById('btn-agregar');
    if (menu) menu.style.display = 'flex';
    if (btnAgregar) btnAgregar.style.display = 'flex';
    
    actualizarEncabezadoUsuario();
    if (document.getElementById('perfil-nombre')) document.getElementById('perfil-nombre').innerText = usuarioActivo.nombre;
    if (document.getElementById('perfil-usuario')) document.getElementById('perfil-usuario').innerText = usuarioActivo.email;
    
    renderizarTareas();
    actualizarEstadisticas();
    actualizarRacha();
    verificarNotificacionesPendientes();
    cambiarPantallaApp('inicio');
}

function actualizarEncabezadoUsuario() {
    if (document.getElementById('usuario-activo')) {
        document.getElementById('usuario-activo').innerText = `${usuarioActivo.nombre} | Nivel ${usuarioActivo.nivel} (${usuarioActivo.xp} XP)`;
    }
}

function agregarXP(puntos) {
    usuarioActivo.xp += puntos;
    const nuevoNivel = Math.floor(usuarioActivo.xp / 200) + 1;
    
    if (nuevoNivel > usuarioActivo.nivel) {
        usuarioActivo.nivel = nuevoNivel;
        alert(`¡Felicidades! Has alcanzado el Nivel ${nuevoNivel}`);
    }
    
    const idx = db.usuarios.findIndex(u => u.id_usuario === usuarioActivo.id_usuario);
    if (idx !== -1) db.usuarios[idx] = usuarioActivo;

    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
    guardarBD();
    actualizarEncabezadoUsuario();
}

function cambiarPantallaApp(pantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(p => p.classList.remove('active'));
    
    const objetivo = document.getElementById('pantalla-' + pantalla);
    if (objetivo) {
        objetivo.classList.add('active');
    }

    const navIcons = document.querySelectorAll('.nav-icon');
    navIcons.forEach(icon => icon.classList.remove('active'));
    const iconActivo = document.querySelector(`.nav-icon[onclick*="${pantalla}"]`);
    if (iconActivo) {
        iconActivo.classList.add('active');
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
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) return alert('El título es obligatorio.');

    const nuevaTarea = {
        id_tarea: Date.now(),
        id_usuario: usuarioActivo.id_usuario,
        titulo: titulo,
        descripcion: document.getElementById('descripcion').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        categoria: document.getElementById('categoria').value,
        prioridad: document.getElementById('prioridad').value,
        estado: 'pendiente'
    };

    db.tareas.push(nuevaTarea);
    guardarBD();
    renderizarTareas();
    actualizarEstadisticas();
    verificarNotificacionesPendientes();

    document.getElementById('titulo').value = '';
    document.getElementById('descripcion').value = '';
    const modalElement = document.getElementById('modalTarea');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.hide();
}

let filtroActual = 'todas';

function renderizarTareas(filtro = filtroActual) {
    filtroActual = filtro;
    const contenedorLista = document.getElementById('lista-tareas');
    const contenedorInicio = document.getElementById('proximas-tareas-inicio');
    if (!contenedorLista) return;

    const tareasUsuario = db.tareas.filter(t => t.id_usuario === usuarioActivo.id_usuario);
    let tareasFiltradas = tareasUsuario;

    if (filtro === 'pendientes') tareasFiltradas = tareasUsuario.filter(t => t.estado === 'pendiente');
    if (filtro === 'completadas') tareasFiltradas = tareasUsuario.filter(t => t.estado === 'completada');

    let html = '';
    tareasFiltradas.forEach(t => {
        const completada = t.estado === 'completada';
        html += `
            <div class="card p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
                <div>
                    <h5 class="${completada ? 'text-decoration-line-through text-muted' : ''} mb-1">${t.titulo}</h5>
                    <small class="text-muted">${t.categoria} | Prioridad: ${t.prioridad}</small>
                </div>
                <button class="btn btn-sm ${completada ? 'btn-secondary' : 'btn-success'}" onclick="completarTarea(${t.id_tarea})">
                    <i class="bi ${completada ? 'bi-arrow-counterclockwise' : 'bi-check-lg'}"></i>
                </button>
            </div>
        `;
    });

    contenedorLista.innerHTML = html || '<p class="text-white">No hay tareas en esta sección.</p>';

    if (contenedorInicio) {
        const pendientesInicio = tareasUsuario.filter(t => t.estado === 'pendiente');
        let htmlInicio = '';
        pendientesInicio.forEach(t => {
            htmlInicio += `
                <div class="card p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${t.titulo}</h5>
                        <small class="text-muted">${t.categoria} | Prioridad: ${t.prioridad}</small>
                    </div>
                    <button class="btn btn-sm btn-success" onclick="completarTarea(${t.id_tarea})">
                        <i class="bi bi-check-lg"></i>
                    </button>
                </div>
            `;
        });
        contenedorInicio.innerHTML = htmlInicio || '<p class="text-white">Sin tareas pendientes.</p>';
    }

    actualizarEstadisticas();
}

function filtrarTareas(tipo) {
    filtroActual = tipo;
    renderizarTareas(tipo);
}

function completarTarea(id) {
    const tarea = db.tareas.find(t => t.id_tarea === id);
    if (tarea) {
        if (tarea.estado === 'pendiente') {
            tarea.estado = 'completada';
            if (!tarea.fecha) tarea.fecha = new Date().toISOString().split('T')[0];
            agregarXP(50);
            reproducirSonidoNotificacion('notificacion');
        } else {
            tarea.estado = 'pendiente';
        }

        guardarBD();
        renderizarTareas(filtroActual);
        actualizarRacha();
        verificarNotificacionesPendientes();
    }
}

function actualizarRacha() {
    if (!usuarioActivo) return;

    const completadas = db.tareas.filter(t => t.id_usuario === usuarioActivo.id_usuario && t.estado === 'completada');

    if (completadas.length === 0) {
        mostrarTextoRacha(0);
        return;
    }

    const hoy = new Date().toISOString().split('T')[0];

    const fechas = completadas
        .map(t => t.fecha || hoy)
        .sort()
        .reverse();

    const fechasUnicas = [...new Set(fechas)];

    let fechaCheck = new Date();
    let contadorConsecutivo = 0;

    for (let i = 0; i < 30; i++) {
        const fStr = fechaCheck.toISOString().split('T')[0];
        if (fechasUnicas.includes(fStr)) {
            contadorConsecutivo++;
            fechaCheck.setDate(fechaCheck.getDate() - 1);
        } else if (i === 0) {
            fechaCheck.setDate(fechaCheck.getDate() - 1);
        } else {
            break;
        }
    }

    const rachaCalculada = Math.max(1, contadorConsecutivo);
    mostrarTextoRacha(rachaCalculada);
}

function mostrarTextoRacha(dias) {
    const elDias = document.getElementById('racha-dias');
    const elMensaje = document.getElementById('racha-mensaje');

    if (elDias) elDias.innerText = dias;
    if (elMensaje) {
        if (dias === 0) {
            elMensaje.innerText = "¡Completa una tarea hoy para empezar!";
        } else if (dias === 1) {
            elMensaje.innerText = "¡Buen inicio! Vuelve mañana para mantenerla.";
        } else {
            elMensaje.innerText = `¡Increíble! ${dias} días seguidos. ¡Sigue así!`;
        }
    }
}

function cambiarTema() { document.body.classList.toggle('modo-oscuro'); }

function toggleProgresoPerfil() {
    const switchProgreso = document.getElementById('privProgreso');
    const cajaResumen = document.getElementById('resumen-progreso-perfil');
    
    if (switchProgreso && cajaResumen) {
        if (switchProgreso.checked) {
            cajaResumen.style.display = 'block';
            const completadas = db.tareas.filter(t => t.id_usuario === usuarioActivo.id_usuario && t.estado === 'completada').length;
            const elCompletadas = document.getElementById('perfil-completadas-num');
            const elNivel = document.getElementById('perfil-nivel');
            
            if (elCompletadas) elCompletadas.innerText = completadas;
            if (elNivel) elNivel.innerText = `Nivel ${usuarioActivo.nivel} (${usuarioActivo.xp} XP)`;
        } else {
            cajaResumen.style.display = 'none';
        }
    }
}
