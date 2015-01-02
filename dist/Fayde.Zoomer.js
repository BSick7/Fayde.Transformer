var Fayde;
(function (Fayde) {
    var Zoomer;
    (function (Zoomer) {
        Zoomer.Version = '0.4.0';
    })(Zoomer = Fayde.Zoomer || (Fayde.Zoomer = {}));
})(Fayde || (Fayde = {}));
var Vector = Fayde.Utils.Vector;
var Fayde;
(function (Fayde) {
    var Zoomer;
    (function (Zoomer) {
        var MAX_FPS = 100;
        var MAX_MSPF = 1000 / MAX_FPS;
        var LogicalZoomer = (function () {
            function LogicalZoomer() {
                this._LastVisualTick = new Date(0).getTime();
                this._IsPointerDown = false;
                this._IsDragging = false;
                this._PointerDelta = new Vector(0, 0);
                this._DragVelocity = new Vector(0, 0);
                this._DragAcceleration = new Vector(0, 0);
                this._VelocityAccumulationTolerance = 10; // dragging faster than this builds velocity
                this._DragMinSpeed = 2;
                this._DragMaxSpeed = 30;
                this._DragFriction = 2;
                this.ZoomLevels = 5;
                this.ZoomLevel = 0;
                this.ConstrainToViewport = true;
                this.DragAccelerationEnabled = true;
                this.UpdateTransform = new Fayde.RoutedEvent();
                this._TweenEasing = TWEEN.Easing.Quadratic.InOut;
                this._Timer = new Fayde.ClockTimer();
                this._Timer.RegisterTimer(this);
            }
            Object.defineProperty(LogicalZoomer.prototype, "ScaleTransform", {
                get: function () {
                    if (!this._ScaleTransform) {
                        var scaleTransform = new ScaleTransform();
                        scaleTransform.ScaleX = 1;
                        scaleTransform.ScaleY = 1;
                        return scaleTransform;
                    }
                    return this._ScaleTransform;
                },
                set: function (value) {
                    this._ScaleTransform = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(LogicalZoomer.prototype, "TranslateTransform", {
                get: function () {
                    if (!this._TranslateTransform) {
                        var translateTransform = new TranslateTransform();
                        translateTransform.X = 0;
                        translateTransform.Y = 0;
                        return translateTransform;
                    }
                    return this._TranslateTransform;
                },
                set: function (value) {
                    this._TranslateTransform = value;
                },
                enumerable: true,
                configurable: true
            });
            LogicalZoomer.prototype.OnTicked = function (lastTime, nowTime) {
                var now = new Date().getTime();
                if (now - this._LastVisualTick < MAX_MSPF)
                    return;
                this._LastVisualTick = now;
                TWEEN.update(nowTime);
                if (this.DragAccelerationEnabled) {
                    this._AddVelocity();
                }
                if (this.ConstrainToViewport) {
                    this._Constrain();
                }
                this.UpdateTransform.raise(this, new Fayde.RoutedEventArgs());
            };
            LogicalZoomer.prototype.SizeChanged = function (viewportSize) {
                this.ViewportSize = viewportSize;
                this.ScaleTransform = this._GetTargetScaleTransform(this.ZoomLevel);
                this.TranslateTransform = this._GetTargetTranslateTransform(this.ScaleTransform);
            };
            LogicalZoomer.prototype.ZoomTo = function (level) {
                var _this = this;
                if (!(level >= 0) || !(level <= this.ZoomLevels))
                    return;
                var scale = this._GetTargetScaleTransform(level);
                var translate = this._GetTargetTranslateTransform(scale);
                var currentSize = new Size(this.ScaleTransform.ScaleX, this.ScaleTransform.ScaleY);
                var newSize = new Size(scale.ScaleX, scale.ScaleY);
                var zoomTween = new TWEEN.Tween(currentSize).to(newSize, this.AnimationSpeed).delay(0).easing(this._TweenEasing).onUpdate(function () {
                    _this.ScaleTransform.ScaleX = currentSize.width;
                    _this.ScaleTransform.ScaleY = currentSize.height;
                }).onComplete(function () {
                    //console.log("zoomLevel: " + this.ZoomLevel);
                });
                zoomTween.start(this._LastVisualTick);
                this.ScrollTo(translate);
            };
            LogicalZoomer.prototype._GetTargetScaleTransform = function (level) {
                var transform = new ScaleTransform();
                transform.ScaleX = Math.pow(this.ZoomFactor, level);
                transform.ScaleY = Math.pow(this.ZoomFactor, level);
                return transform;
            };
            LogicalZoomer.prototype.ScrollTo = function (newTransform) {
                var _this = this;
                var currentOffset = new Size(this.TranslateTransform.X, this.TranslateTransform.Y);
                var newOffset = new Size(newTransform.X, newTransform.Y);
                var scrollTween = new TWEEN.Tween(currentOffset).to(newOffset, this.AnimationSpeed).delay(0).easing(this._TweenEasing).onUpdate(function () {
                    _this.TranslateTransform.X = currentOffset.width;
                    _this.TranslateTransform.Y = currentOffset.height;
                });
                scrollTween.start(this._LastVisualTick);
            };
            LogicalZoomer.prototype._GetTargetTranslateTransform = function (targetScaleTransform) {
                var currentCenter = this._GetZoomOrigin(this.ScaleTransform);
                var targetCenter = this._GetZoomOrigin(targetScaleTransform);
                var diff = new Point(targetCenter.x - currentCenter.x, targetCenter.y - currentCenter.y);
                var translateTransform = new TranslateTransform();
                translateTransform.X = this.TranslateTransform.X - diff.x;
                translateTransform.Y = this.TranslateTransform.Y - diff.y;
                return translateTransform;
            };
            LogicalZoomer.prototype._GetZoomOrigin = function (scaleTransform) {
                // todo: use this.RenderTransformOrigin instead of halving width
                var width = scaleTransform.ScaleX * this.ViewportSize.width;
                var height = scaleTransform.ScaleY * this.ViewportSize.height;
                return new Point(width * 0.5, height * 0.5);
            };
            LogicalZoomer.prototype._Constrain = function () {
                if (this.TranslateTransform.X > 0) {
                    this.TranslateTransform.X = 0;
                }
                var width = this.ScaleTransform.ScaleX * this.ViewportSize.width;
                if (this.TranslateTransform.X < (width - this.ViewportSize.width) * -1) {
                    this.TranslateTransform.X = (width - this.ViewportSize.width) * -1;
                }
                if (this.TranslateTransform.Y > 0) {
                    this.TranslateTransform.Y = 0;
                }
                var height = this.ScaleTransform.ScaleY * this.ViewportSize.height;
                if (this.TranslateTransform.Y < (height - this.ViewportSize.height) * -1) {
                    this.TranslateTransform.Y = (height - this.ViewportSize.height) * -1;
                }
            };
            LogicalZoomer.prototype._AddVelocity = function () {
                var pointerStopped = false;
                if (this._LastDragAccelerationPointerPosition && this._LastDragAccelerationPointerPosition.Equals(this._PointerPosition)) {
                    pointerStopped = true;
                }
                this._LastDragAccelerationPointerPosition = this._PointerPosition;
                if (this._IsDragging) {
                    if (pointerStopped) {
                        // pointer isn't moving. remove velocity
                        this._RemoveVelocity();
                    }
                    else {
                        // only add to velocity if dragging fast enough
                        if (this._PointerDelta.Mag() > this._VelocityAccumulationTolerance) {
                            // calculate acceleration
                            this._DragAcceleration.Add(this._PointerDelta);
                            // integrate acceleration
                            this._DragVelocity.Add(this._DragAcceleration);
                            this._DragVelocity.Limit(this._DragMaxSpeed);
                        }
                    }
                }
                else {
                    // decelerate if _DragVelocity is above minimum speed
                    if (this._DragVelocity.Mag() > this._DragMinSpeed) {
                        // calculate deceleration
                        var friction = this._DragVelocity.Get();
                        friction.Mult(-1);
                        friction.Normalise();
                        friction.Mult(this._DragFriction);
                        this._DragAcceleration.Add(friction);
                        // integrate deceleration
                        this._DragVelocity.Add(this._DragAcceleration);
                        this.TranslateTransform.X += this._DragVelocity.X;
                        this.TranslateTransform.Y += this._DragVelocity.Y;
                    }
                }
                // reset acceleration
                this._DragAcceleration.Mult(0);
            };
            LogicalZoomer.prototype._RemoveVelocity = function () {
                this._DragVelocity.Mult(0);
            };
            LogicalZoomer.prototype.PointerDown = function (position) {
                this._IsPointerDown = true;
                this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
                this._PointerPosition = new Vector(position.x, position.y);
                this._RemoveVelocity();
            };
            LogicalZoomer.prototype.PointerUp = function () {
                this._IsPointerDown = false;
                this._IsDragging = false;
            };
            LogicalZoomer.prototype.PointerMove = function (position) {
                if (this._IsPointerDown) {
                    this._IsDragging = true;
                }
                this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
                this._PointerPosition = new Vector(position.x, position.y);
                this._PointerDelta = this._PointerPosition.Get();
                this._PointerDelta.Sub(this._LastPointerPosition);
                if (this._IsDragging) {
                    this.TranslateTransform.X += this._PointerDelta.X;
                    this.TranslateTransform.Y += this._PointerDelta.Y;
                }
            };
            return LogicalZoomer;
        })();
        Zoomer.LogicalZoomer = LogicalZoomer;
    })(Zoomer = Fayde.Zoomer || (Fayde.Zoomer = {}));
})(Fayde || (Fayde = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ScaleTransform = Fayde.Media.ScaleTransform;
var TranslateTransform = Fayde.Media.TranslateTransform;
var TransformGroup = Fayde.Media.TransformGroup;
var Fayde;
(function (Fayde) {
    var Zoomer;
    (function (_Zoomer) {
        var Zoomer = (function (_super) {
            __extends(Zoomer, _super);
            function Zoomer() {
                _super.call(this);
                this.TransformUpdated = new nullstone.Event();
                this.DefaultStyleKey = Zoomer;
                this.MouseLeftButtonDown.on(this.Zoomer_MouseLeftButtonDown, this);
                this.MouseLeftButtonUp.on(this.Zoomer_MouseLeftButtonUp, this);
                this.MouseMove.on(this.Zoomer_MouseMove, this);
                this.TouchDown.on(this.Zoomer_TouchDown, this);
                this.TouchUp.on(this.Zoomer_TouchUp, this);
                this.TouchMove.on(this.Zoomer_TouchMove, this);
                this.SizeChanged.on(this.Zoomer_SizeChanged, this);
                this._LogicalZoomer = new _Zoomer.LogicalZoomer();
                this._LogicalZoomer.AnimationSpeed = this.AnimationSpeed;
                this._LogicalZoomer.ZoomFactor = this.ZoomFactor;
                this._LogicalZoomer.ZoomLevels = this.ZoomLevels;
                this._LogicalZoomer.ZoomLevel = this.ZoomLevel;
                this._LogicalZoomer.ConstrainToViewport = this.ConstrainToViewport;
                this._LogicalZoomer.DragAccelerationEnabled = this.DragAccelerationEnabled;
                this._LogicalZoomer.ViewportSize = this.ViewportSize;
                this._LogicalZoomer.UpdateTransform.on(this.UpdateTransform, this);
            }
            Zoomer.prototype.OnZoomFactorChanged = function (args) {
                this._LogicalZoomer.ZoomFactor = this.ZoomFactor;
                this._LogicalZoomer.ZoomTo(this.ZoomLevel);
            };
            Zoomer.prototype.OnZoomLevelsChanged = function (args) {
                this._LogicalZoomer.ZoomLevels = this.ZoomLevels;
                this._LogicalZoomer.ZoomTo(this.ZoomLevel);
            };
            Zoomer.prototype.OnZoomLevelChanged = function (args) {
                this._LogicalZoomer.ZoomLevel = this.ZoomLevel;
                this._LogicalZoomer.ZoomTo(this.ZoomLevel);
            };
            Zoomer.prototype.OnConstrainToViewportChanged = function (args) {
                this._LogicalZoomer.ConstrainToViewport = this.ConstrainToViewport;
            };
            Zoomer.prototype.OnAnimationSpeedChanged = function (args) {
                this._LogicalZoomer.AnimationSpeed = this.AnimationSpeed;
            };
            Zoomer.prototype.OnDragAccelerationEnabledChanged = function (args) {
                this._LogicalZoomer.DragAccelerationEnabled = this.DragAccelerationEnabled;
            };
            Object.defineProperty(Zoomer.prototype, "ViewportSize", {
                get: function () {
                    return new Size(this.ActualWidth, this.ActualHeight);
                },
                enumerable: true,
                configurable: true
            });
            Zoomer.prototype.UpdateTransform = function () {
                var transformGroup = new TransformGroup();
                transformGroup.Children.Add(this._LogicalZoomer.ScaleTransform);
                transformGroup.Children.Add(this._LogicalZoomer.TranslateTransform);
                this.RenderTransform = transformGroup;
                this.TransformUpdated.raise(this, new _Zoomer.ZoomerEventArgs(this._LogicalZoomer.ScaleTransform, this._LogicalZoomer.TranslateTransform));
            };
            // intialise viewport size and handle resizing
            Zoomer.prototype.Zoomer_SizeChanged = function (sender, e) {
                this._LogicalZoomer.SizeChanged(this.ViewportSize);
            };
            Zoomer.prototype.Zoomer_MouseLeftButtonDown = function (sender, e) {
                if (e.Handled)
                    return;
                this.CaptureMouse();
                this._LogicalZoomer.PointerDown(e.AbsolutePos);
            };
            Zoomer.prototype.Zoomer_MouseLeftButtonUp = function (sender, e) {
                if (e.Handled)
                    return;
                this._LogicalZoomer.PointerUp();
                this.ReleaseMouseCapture();
            };
            Zoomer.prototype.Zoomer_MouseMove = function (sender, e) {
                if (e.Handled)
                    return;
                this._LogicalZoomer.PointerMove(e.AbsolutePos);
            };
            Zoomer.prototype.Zoomer_TouchDown = function (sender, e) {
                if (e.Handled)
                    return;
                this.CaptureMouse();
                var pos = e.GetTouchPoint(null);
                this._LogicalZoomer.PointerDown(new Point(pos.Position.x, pos.Position.y));
            };
            Zoomer.prototype.Zoomer_TouchUp = function (sender, e) {
                if (e.Handled)
                    return;
                this.ReleaseMouseCapture();
                this._LogicalZoomer.PointerUp();
            };
            Zoomer.prototype.Zoomer_TouchMove = function (sender, e) {
                if (e.Handled)
                    return;
                var pos = e.GetTouchPoint(null);
                this._LogicalZoomer.PointerMove(new Point(pos.Position.x, pos.Position.y));
            };
            Zoomer.ZoomFactorProperty = DependencyProperty.RegisterFull("ZoomFactor", function () { return Number; }, Zoomer, 2, function (d, args) { return d.OnZoomFactorChanged(args); });
            Zoomer.ZoomLevelsProperty = DependencyProperty.RegisterFull("ZoomLevels", function () { return Number; }, Zoomer, 0, function (d, args) { return d.OnZoomLevelsChanged(args); });
            Zoomer.ZoomLevelProperty = DependencyProperty.RegisterFull("ZoomLevel", function () { return Number; }, Zoomer, 0, function (d, args) { return d.OnZoomLevelChanged(args); });
            Zoomer.ConstrainToViewportProperty = DependencyProperty.RegisterFull("ConstrainToViewport", function () { return Boolean; }, Zoomer, true, function (d, args) { return d.OnConstrainToViewportChanged(args); });
            Zoomer.AnimationSpeedProperty = DependencyProperty.RegisterFull("AnimationSpeed", function () { return Number; }, Zoomer, 250, function (d, args) { return d.OnAnimationSpeedChanged(args); });
            Zoomer.DragAccelerationEnabledProperty = DependencyProperty.RegisterFull("DragAccelerationEnabled", function () { return Boolean; }, Zoomer, true, function (d, args) { return d.OnDragAccelerationEnabledChanged(args); });
            return Zoomer;
        })(Fayde.Controls.ContentControl);
        _Zoomer.Zoomer = Zoomer;
    })(Zoomer = Fayde.Zoomer || (Fayde.Zoomer = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Zoomer;
    (function (Zoomer) {
        var ZoomerEventArgs = (function () {
            function ZoomerEventArgs(scale, translate) {
                Object.defineProperty(this, 'Scale', { value: scale, writable: false });
                Object.defineProperty(this, 'Translate', { value: translate, writable: false });
            }
            return ZoomerEventArgs;
        })();
        Zoomer.ZoomerEventArgs = ZoomerEventArgs;
    })(Zoomer = Fayde.Zoomer || (Fayde.Zoomer = {}));
})(Fayde || (Fayde = {}));
//# sourceMappingURL=Fayde.Zoomer.js.map