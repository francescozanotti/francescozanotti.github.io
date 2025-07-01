import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'lil-gui'
import gsap from 'gsap'

/**
 * Debug
 */
const gui = new dat.GUI()

const parameters = {
    materialColor: '#ffeded'
}

gui
    .addColor(parameters, 'materialColor')
    .onChange(() => {
        // Update all toon materials
        toonMaterials.forEach(mat => {
            mat.color.set(parameters.materialColor);
        });
        particlesMaterial.color.set(parameters.materialColor);
    })

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Objects
 */
//Texture
const textureLoader = new THREE.TextureLoader()
const gradientTexture = textureLoader.load('textures/gradients/3.jpg')
gradientTexture.magFilter = THREE.NearestFilter

// Array to store all toon materials for dynamic updates
const toonMaterials = [];

// Function to create a new toon material with the current settings
function createToonMaterial(color) {
    const material = new THREE.MeshToonMaterial({
        color: color || parameters.materialColor,
        gradientMap: gradientTexture
    });
    toonMaterials.push(material);
    return material;
}

// Initial material
const material = createToonMaterial(parameters.materialColor);

// Meshes
const objectsDistance = 4
let mesh1, mesh2, mesh3;
const sectionMeshes = [];

// Create a function to handle model loading and material replacement
async function loadModel(url, positionY, positionX) {
    // Load the model
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => resolve(gltf),
            undefined,
            (error) => reject(error)
        );
    });
    
    // Get the first mesh from the loaded model
    const model = gltf.scene.children[0];
    
    // Replace all materials in the model with our toon material
    model.traverse((child) => {
        if (child.isMesh) {
            // Create a new material that uses our toon shader
            const modelMaterial = createToonMaterial(parameters.materialColor);
            child.material = modelMaterial;
        }
    });
    
    // Position the model
    model.position.y = -objectsDistance * positionY;
    model.position.x = positionX;
    
    // Scale if needed (adjust based on your models)
    model.scale.set(1, 1, 1);
    
    // Add to scene
    scene.add(model);
    
    return model;
}

// Import models
import model1Url from './assets/models/1.glb?url';
import model2Url from './assets/models/2.glb?url';
import model3Url from './assets/models/3.glb?url';

// Load all models
Promise.all([
    loadModel(model1Url, 0, 2),
    loadModel(model2Url, 1, -2),
    loadModel(model3Url, 2, 2)
]).then((models) => {
    [mesh1, mesh2, mesh3] = models;
    sectionMeshes.push(mesh1, mesh2, mesh3);
    
    // Start animation loop after models are loaded
    tick();
}).catch((error) => {
    console.error('Error loading models:', error);
});

/**
 * Particles
 */
//Geometry
const particlesCount = 200
const positions = new Float32Array(particlesCount * 3)

for (let i = 0; i < particlesCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = objectsDistance * 0.5 - Math.random() * objectsDistance * sectionMeshes.length
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10
}

const particlesGeometry = new THREE.BufferGeometry()
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

// Material
const particlesMaterial = new THREE.PointsMaterial({
    color: parameters.materialColor,
    sizeAttenuation: true,
    size: 0.03
})

// Points
const particles = new THREE.Points(particlesGeometry, particlesMaterial)
scene.add(particles)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 1)
directionalLight.position.set(1, 1, 0)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Group
const cameraGroup = new THREE.Group()
scene.add(cameraGroup)

// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 6
cameraGroup.add(camera)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Scroll
 */
let scrollY = window.scrollY
let currentSection = 0

window.addEventListener('scroll', () => {
    scrollY = window.scrollY

    const newSection = Math.round(scrollY / sizes.height)

    if(newSection != currentSection) {
        currentSection = newSection

        gsap.to(
            sectionMeshes[currentSection].rotation,
            {
                duration: 1.5,
                ease: 'power2.inOut',
                x: '+=6',
                y:'+=3',
                z: '+=1.5'
            }
        )
    }
})

/**
 * Cursor
 */
const cursor = {}
cursor.x = 0
cursor.y = 0

window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / sizes.width - 0.5
    cursor.y = event.clientY / sizes.height - 0.5
})

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Animate camera
    camera.position.y = - scrollY / sizes.height * objectsDistance

    const parallaxX = cursor.x * 0.5
    const parallaxY = - cursor.y * 0.5
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 5 * deltaTime
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 5 * deltaTime

    // Animate meshes
    for (const mesh of sectionMeshes) {
        mesh.rotation.x += deltaTime * 0.1
        mesh.rotation.y += deltaTime * 0.12
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()