import { Outlet } from 'react-router-dom';
import Menu from './Menu';

/**
 * Layout — estructura común de las páginas privadas:
 * menú arriba y el contenido de la ruta activa abajo.
 */
export default function Layout() {
    return (
        <>
            <Menu />
            <main className="container-xl py-4 px-3 px-md-4">
                <Outlet />
            </main>
        </>
    );
}
