
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from 'react';

const colors = ["#BD93F9", "#FF79C6", "#50FA7B", "#8BE9FD", "#F1FA8C"];

const createConfettiPiece = (canvasWidth: number, canvasHeight: number) => {
    return {
        x: Math.random() * canvasWidth,
        y: Math.random() * -canvasHeight,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 2 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 20 - 10,
    };
};

export function Confetti() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let pieces = Array.from({ length: 150 }, () => createConfettiPiece(canvas.width, canvas.height));
        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            let allPiecesOffScreen = true;
            pieces.forEach((p, index) => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotationSpeed;
                
                if (p.y < canvas.height) {
                    allPiecesOffScreen = false;
                    ctx.save();
                    ctx.fillStyle = p.color;
                    ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
                    ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            });

            if (allPiecesOffScreen) {
                cancelAnimationFrame(animationFrameId);
                // Clear canvas at the end
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animate();

        const resizeHandler = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resizeHandler);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeHandler);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-50"
        />
    );
}
