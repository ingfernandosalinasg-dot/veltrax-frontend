import Particles from "react-tsparticles";

import { loadFull } from "tsparticles";

import { useCallback } from "react";

function ParticlesBackground() {

    const particlesInit = useCallback(async (engine) => {

        await loadFull(engine);

    }, []);

    return (

        <Particles

            id="tsparticles"

            init={particlesInit}

            options={{

                fullScreen: {
                    enable: true,
                    zIndex: -1
                },

                background: {
                    color: {
                        value: "#020617"
                    }
                },

                fpsLimit: 120,

                particles: {

                    number: {
                        value: 90,
                        density: {
                            enable: true,
                            area: 800
                        }
                    },

                    color: {
                        value: "#06b6d4"
                    },

                    shape: {
                        type: "circle"
                    },

                    opacity: {
                        value: 0.5
                    },

                    size: {
                        value: { min: 1, max: 4 }
                    },

                    links: {

                        enable: true,

                        distance: 150,

                        color: "#06b6d4",

                        opacity: 0.25,

                        width: 1

                    },

                    move: {

                        enable: true,

                        speed: 1.5,

                        direction: "none",

                        random: false,

                        straight: false,

                        outModes: {
                            default: "bounce"
                        }

                    }

                },

                interactivity: {

                    events: {

                        onHover: {
                            enable: true,
                            mode: "grab"
                        },

                        onClick: {
                            enable: true,
                            mode: "push"
                        },

                        resize: true

                    },

                    modes: {

                        grab: {

                            distance: 180,

                            links: {
                                opacity: 0.5
                            }

                        },

                        push: {
                            quantity: 4
                        }

                    }

                },

                detectRetina: true

            }}

        />
    );
}

export default ParticlesBackground;








