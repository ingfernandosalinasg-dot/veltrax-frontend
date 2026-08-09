import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function CreateTripPage() {

    const [trip, setTrip] = useState({
        cliente: "",
        operador: "",
        unidad: "",
        origen: "",
        destino: "",
        salida: "",
        llegada: "",
        costo: "",
        observaciones: ""
    });

    const handleChange = (e) => {

        setTrip({
            ...trip,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {

        e.preventDefault();

        console.log("Nuevo Viaje:", trip);

        alert("Viaje creado correctamente 馃殮");
    };

    return (

        <div className="flex min-h-screen bg-[#020617] text-white">

            <Sidebar />

            <div className="flex-1 p-10">

                <Topbar />

                <motion.div

                    initial={{
                        opacity:0,
                        y:-20
                    }}

                    animate={{
                        opacity:1,
                        y:0
                    }}

                    className="mb-10"

                >

                    <h1
                        className="
                            text-5xl
                            font-black
                            text-cyan-300
                            title-font
                        "
                    >
                        NUEVO VIAJE
                    </h1>

                    <p className="text-gray-400 mt-3">
                        Registro inteligente de viajes Veltrax
                    </p>

                </motion.div>

                <motion.form

                    initial={{
                        opacity:0,
                        y:20
                    }}

                    animate={{
                        opacity:1,
                        y:0
                    }}

                    onSubmit={handleSubmit}

                    className="
                        bg-white/5
                        border
                        border-cyan-400/10
                        rounded-3xl
                        backdrop-blur-xl
                        p-10
                    "

                >

                    <div className="grid md:grid-cols-2 gap-6">

                        <input
                            type="text"
                            name="cliente"
                            placeholder="Cliente"
                            value={trip.cliente}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="text"
                            name="operador"
                            placeholder="Operador"
                            value={trip.operador}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="text"
                            name="unidad"
                            placeholder="Unidad"
                            value={trip.unidad}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="number"
                            name="costo"
                            placeholder="Costo"
                            value={trip.costo}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="text"
                            name="origen"
                            placeholder="Origen"
                            value={trip.origen}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="text"
                            name="destino"
                            placeholder="Destino"
                            value={trip.destino}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="datetime-local"
                            name="salida"
                            value={trip.salida}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                        <input
                            type="datetime-local"
                            name="llegada"
                            value={trip.llegada}
                            onChange={handleChange}
                            className="inputStyle"
                        />

                    </div>

                    <textarea

                        rows="5"

                        name="observaciones"

                        placeholder="Observaciones"

                        value={trip.observaciones}

                        onChange={handleChange}

                        className="
                            mt-6
                            w-full
                            bg-black/20
                            border
                            border-cyan-400/10
                            rounded-2xl
                            p-4
                            outline-none
                            focus:border-cyan-400
                        "

                    />

                    <div className="mt-8 flex justify-end">

                        <button

                            type="submit"

                            className="
                                px-8
                                py-4
                                rounded-2xl
                                bg-cyan-500
                                hover:bg-cyan-400
                                transition
                                font-bold
                            "

                        >
                            Guardar Viaje
                        </button>

                    </div>

                </motion.form>

            </div>

        </div>
    );
}

export default CreateTripPage;




